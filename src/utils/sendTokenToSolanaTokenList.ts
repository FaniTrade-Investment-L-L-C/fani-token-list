import { Octokit } from '@octokit/rest';
import axios from 'axios';

export const sendToSolanaTokenList = async (
  githubAccessToken: string,
  tokenMintAddress: string,
  symbol: string,
  tokenName: string,
  decimals: string,
  logoURL: string,
  website?: string,
  facebook?: string,
  twitter?: string,
  github?: string,
  discord?: string,
  telegram?: string
) => {
  const octokit = new Octokit({
    auth: githubAccessToken
  });

  const getURL = await (
    await axios.get(
      'https://api.github.com/repos/FaniTrade-Investment-L-L-C/fani-token-list/contents/src/tokens'
    )
  ).data[0].git_url;
  // @ts-ignore
  const response = await axios({
    method: 'get',
    url: getURL,
    responseType: 'application/json'
  });

  let cnt = response.data.content;
    let decoded = Buffer.from(cnt, 'base64').toString();
    const strAsUnicode = (str: any) => {
      return str
        .split('')
        .map((s: any) => {
          return `\\u${s.charCodeAt(0).toString(16).padStart(4, '0')}`;
        })
        .join('');
    };
    decoded = JSON.parse(decoded);

    let newToken = {
      chainId: 101,
      address: `${tokenMintAddress}`,
      symbol: `${symbol}`,
      name: `${tokenName}`,
      decimals: Number(`${decimals}`),
      logoURI: `${logoURL}`,
      tags: ['currency'],
      extensions: {
        website: `${website}`,
        facebook: `${facebook}`,
        twitter: `${twitter}`,
        github: `${github}`,
        discord: `${discord}`,
        telegram: `${telegram}`
      }
    };
    const handledNewToken = JSON.parse(
      JSON.stringify(newToken),
      // @ts-ignore
      (key, value) => (value === null || value === '' ? undefined : value)
    );
    const ext = newToken.extensions;
    if (
      (ext.discord.length == 0 || ext.discord.length == undefined) &&
      (ext.facebook.length == 0 || ext.facebook.length == undefined) &&
      (ext.github.length == 0 || ext.github.length == undefined) &&
      (ext.telegram.length == 0 || ext.telegram.length == undefined) &&
      (ext.twitter.length == 0 || ext.twitter.length == undefined) &&
      (ext.website.length == 0 || ext.website.length == undefined)
    ) {
      delete handledNewToken.extensions;
    }
    // @ts-ignore
    decoded.tokens.push(handledNewToken);

    const branchName = `${tokenName.replace(' ', '-')}`;
    const pushFiles = async () => {
      try {
        // git fetch upstream
        await octokit.rest.repos.mergeUpstream({
          owner: 'FaniTrade-Investment-L-L-C',
          repo: 'fani-token-list',
          branch: 'main'
        });

        //git pull
        const commits = await octokit.repos.listCommits({
          owner: 'FaniTrade-Investment-L-L-C',
          repo: 'fani-token-list'
        });

        const latestCommitSHA = commits.data[0].sha;

        // git checkout -b TokenName
        await octokit.git.createRef({
          owner: 'FaniTrade-Investment-L-L-C',
          repo: 'fani-token-list',
          ref: `refs/heads/${tokenName.replaceAll(' ', '-')}`,
          sha: latestCommitSHA
        });

        // git add .
        const {
          data: { sha: treeSHA }
        } = await octokit.git.createTree({
          owner: 'FaniTrade-Investment-L-L-C',
          repo: 'fani-token-list',
          tree: [
            {
              path: 'src/tokens/solana.tokenlist.json',
              mode: '100644',
              type: 'blob',
              content: JSON.stringify(decoded, null, 2)
                .replaceAll('&', strAsUnicode('&'))
                .replaceAll('>', strAsUnicode('>'))
                .replaceAll('<', strAsUnicode('<'))
            }
          ],
          base_tree: latestCommitSHA
        });


        // git commit -m
        const {
          data: { sha: newCommitSHA }
        } = await octokit.git.createCommit({
          owner: 'FaniTrade-Investment-L-L-C',
          repo: 'fani-token-list',
          tree: treeSHA,
          message: `Create ${tokenName} Token`,
          parents: [latestCommitSHA]
        });


        // git push origin HEAD
       await octokit.rest.git.updateRef({
          owner: 'FaniTrade-Investment-L-L-C',
          repo: 'fani-token-list',
          ref: `heads/${branchName}`,
          sha: newCommitSHA
        })

        await octokit.rest.pulls.create({
          owner: 'FaniTrade-Investment-L-L-C',
          repo: 'fani-token-list',
          title: `Create ${tokenName} Token`,
          head: `FaniTrade-Investment-L-L-C:${branchName}`,
          base: 'main'
          });

        return({
          status: "Created",
          message: "Token Created",
        })

      } catch (err){
        return({
          status: "Failed",
          message: "Error Creating Token",
          detail: "Reference Already exist or invalid input"
        })
      }
    };
    return await pushFiles();
};


