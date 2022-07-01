import * as anchor from '@project-serum/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { fetch } from 'cross-fetch';
import Joi from 'joi';

import { decodeMetadata } from '../utils/Metadata';
import { sendToSolanaTokenList } from '../utils/sendTokenToSolanaTokenList';
import tokenlist from './../tokens/solana.tokenlist.json';
const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
);


const schema = Joi.object({
  chainId: Joi.number().
               required(),
  address: Joi.string()
      .required(),

  symbol: Joi.string()
             .required(),

  name: Joi.string()
           .required(),

  decimals: Joi.string().
           required(),
  logoURI: Joi.string()
              .required(),
  extensions: Joi.object().optional()
})



export enum ENV {
  MainnetBeta = 101,
  Testnet = 102,
  Devnet = 103
}

export interface TokenList {
  readonly name: string;
  readonly logoURI: string;
  readonly tags: { [tag: string]: TagDetails };
  readonly timestamp: string;
  readonly tokens: TokenInfo[];
}

export interface TagDetails {
  readonly name: string;
  readonly description: string;
}

export interface TokenExtensions {
  readonly website?: string;
  readonly bridgeContract?: string;
  readonly assetContract?: string;
  readonly address?: string;
  readonly explorer?: string;
  readonly twitter?: string;
  readonly github?: string;
  readonly medium?: string;
  readonly tgann?: string;
  readonly tggroup?: string;
  readonly discord?: string;
  readonly serumV3Usdt?: string;
  readonly serumV3Usdc?: string;
  readonly coingeckoId?: string;
  readonly imageUrl?: string;
  readonly description?: string;
}

export interface TokenInfo {
  readonly chainId: number;
  readonly address: string;
  readonly name: string;
  readonly decimals: number;
  readonly symbol: string;
  readonly logoURI?: string;
  readonly tags?: string[];
  readonly extensions?: TokenExtensions;
}

export type TokenInfoMap = Map<string, TokenInfo>;

export const CLUSTER_SLUGS: { [id: string]: ENV } = {
  'mainnet-beta': ENV.MainnetBeta,
  testnet: ENV.Testnet,
  devnet: ENV.Devnet
};

export class GitHubTokenListResolutionStrategy {
  repositories = [
    'https://raw.githubusercontent.com/FaniTrade-Investment-L-L-C/fani-token-list/main/src/tokens/solana.tokenlist.json'
  ];

  resolve = () => {
    return queryJsonFiles(this.repositories);
  };
}

export class CDNTokenListResolutionStrategy {
  repositories = [
    'https://cdn.jsdelivr.net/gh/solana-labs/token-list@latest/src/tokens/solana.tokenlist.json'
  ];

  resolve = () => {
    return queryJsonFiles(this.repositories);
  };
}

export class SolanaTokenListResolutionStrategy {
  repositories = ['https://token-list.solana.com/solana.tokenlist.json'];

  resolve = () => {
    return queryJsonFiles(this.repositories);
  };
}

const queryJsonFiles = async (files: string[]) => {
  const responses: TokenList[] = (await Promise.all(
    files.map(async (repo) => {
      try {
        const response = await fetch(repo);
        const json = (await response.json()) as TokenList;
        return json;
      } catch {
        console.info(
          `@solana/token-registry: falling back to static repository.`
        );
        return tokenlist;
      }
    })
  )) as TokenList[];

  return responses
    .map((tokenlist: TokenList) => tokenlist.tokens || [])
    .reduce((acc, arr) => (acc as TokenInfo[]).concat(arr), []);
};

export enum Strategy {
  GitHub = 'GitHub',
  Static = 'Static',
  Solana = 'Solana',
  CDN = 'CDN'
}

export class StaticTokenListResolutionStrategy {
  resolve = () => {
    return tokenlist.tokens || [];
  };
}

export class TokenListProvider {
  static strategies = {
    [Strategy.GitHub]: new GitHubTokenListResolutionStrategy(),
    [Strategy.Static]: new StaticTokenListResolutionStrategy(),
    [Strategy.Solana]: new SolanaTokenListResolutionStrategy(),
    [Strategy.CDN]: new CDNTokenListResolutionStrategy()
  };

  resolve = async (
    strategy: Strategy = Strategy.CDN
  ): Promise<TokenListContainer> => {
    return new TokenListContainer(
      await TokenListProvider.strategies[strategy].resolve()
    );
  };
}

async function getMetadata(mint: PublicKey): Promise<PublicKey> {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer()
      ],
      TOKEN_METADATA_PROGRAM_ID
    )
  )[0];
}


export async function addTokenToList(
  gitAccessToken: string,
  tokenDetails: any
) {
  // const { address, symbol, name, decimals, logoURI, extensions } = tokenDetails;
 
  console.log(gitAccessToken);
  const { error } = schema.validate({ ...tokenDetails });
  if(error) {
    console.log(error)
    return({
      status: "Failed",
      message: "Error Creating Token",
      detail: error.details[0].message
    })
  }
  else {
    const isEmpty = Object.values(tokenDetails.extensions).every(x => x === null || x === '');
   if(isEmpty) {
     delete tokenDetails.extensions;
     console.log("deleting extension obj  values...");
     console.log(tokenDetails)
   } else {
     Object.keys(tokenDetails.extensions).forEach((k) => tokenDetails.extensions[k] == '' && delete tokenDetails.extensions[k]);
      console.log("deleting unused values");
      console.log(tokenDetails);
   }

   const reuslt = await sendToSolanaTokenList(
    gitAccessToken,
    tokenDetails
  );

  return reuslt
  }
}

export async function getTokenMetaData(
  connection: Connection,
  mint: string
): Promise<any> {
  let fetchedData: any;
  const metaData = await getMetadata(new PublicKey(mint));
  const accountInfo = await connection.getParsedAccountInfo(metaData);
  const decodedData = decodeMetadata(accountInfo?.value?.data);
  if (decodedData) {
    const url = encodeURI(decodedData.data.uri);
    return axios.get(url.split('%00%00%00%00')[0]).then((res) => {
      fetchedData = res.data;
      return new Promise(function (resolve) {
        resolve(fetchedData);
      });
    });
  } else {
    return {};
    // // @ts-ignore
    // new Promise(function (resolve, reject) {
    //   reject({});
    // });
  }
}
export class TokenListContainer {
  constructor(private tokenList: TokenInfo[]) {}

  filterByTag = (tag: string) => {
    return new TokenListContainer(
      this.tokenList.filter((item) => (item.tags || []).includes(tag))
    );
  };

  filterByChainId = (chainId: number | ENV) => {
    return new TokenListContainer(
      this.tokenList.filter((item) => item.chainId === chainId)
    );
  };

  excludeByChainId = (chainId: number | ENV) => {
    return new TokenListContainer(
      this.tokenList.filter((item) => item.chainId !== chainId)
    );
  };

  excludeByTag = (tag: string) => {
    return new TokenListContainer(
      this.tokenList.filter((item) => !(item.tags || []).includes(tag))
    );
  };

  filterByClusterSlug = (slug: string) => {
    if (slug in CLUSTER_SLUGS) {
      return this.filterByChainId(CLUSTER_SLUGS[slug]);
    }
    throw new Error(
      `Unknown slug: ${slug}, please use one of ${Object.keys(CLUSTER_SLUGS)}`
    );
  };

  getList = () => {
    return this.tokenList;
  };
}
