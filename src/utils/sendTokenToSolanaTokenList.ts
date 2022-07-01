import { Octokit } from '@octokit/rest';
import axios , { AxiosRequestConfig, AxiosResponse} from 'axios';



export const sendToSolanaTokenList = async (
  githubAccessToken: string,
  tokenDetails: any
) => {
   const { chainId, address , symbol , name , decimals , logoURI , extensions} = tokenDetails;
  
  const octokit = new Octokit({
    auth: githubAccessToken
  });

  const getURL = await (
    await axios.get(
      'https://api.github.com/repos/FaniTrade-Investment-L-L-C/fani-token-list/contents/src/tokens'
    )
  ).data[0].git_url;

  const config: AxiosRequestConfig = {
    method: 'get',
    url: getURL,
  };
  
  const response : AxiosResponse = await axios(config);

  const cnt = response.data.content;
    let decoded : any = Buffer.from(cnt, 'base64').toString();
    const strAsUnicode = (str: any) => {
      return str
        .split('')
        .map((s: any) => {
          return `\\u${s.charCodeAt(0).toString(16).padStart(4, '0')}`;
        })
        .join('');
    };
    decoded = JSON.parse(decoded);

    const newToken = {
      chainId,
      address,
      symbol,
      name,
      decimals: +decimals,
      logoURI,
      tags: ['currency'],
      extensions: extensions ? extensions : {}
    };
    const handledNewToken = JSON.parse(
      JSON.stringify(newToken),
      (_key, value) => (value === null || value === '' ? undefined : value)
    );
    
   
    decoded.tokens.push(handledNewToken);

    const branchName = `${name.replace(' ', '-')}`;
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

        // git checkout -b name
        await octokit.git.createRef({
          owner: 'FaniTrade-Investment-L-L-C',
          repo: 'fani-token-list',
          ref: `refs/heads/${name.replaceAll(' ', '-')}`,
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
          message: `Create ${name} Token`,
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
          title: `Create ${name} Token`,
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


