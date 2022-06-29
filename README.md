

## Adding a New Token
Under development new release will be soon

### Installation

```bash
npm i @fanitrade/fani-solana-tokenlist
```

```bash
yarn add @fanitrade/fani-solana-tokenlist
```

### Examples

#### Query available tokens

```typescript
new TokenListProvider().resolve().then((tokens) => {
  const tokenList = tokens.filterByClusterSlug('mainnet-beta').getList();
  console.log(tokenList);
});
```

### Examples

### Query available tokens on chain
```typescript
import { getTokenMetaData } from "@fanitrade/fani-solana-tokenlist";
import { Connection, clusterApiUrl } from "@solana/web3.js";

const connection = new Connection(clusterApiUrl('devnet'));

( async () => {
  const mint = "7SLdnLCBDFEBAZvzdh9vGeuoZBD165ajKfAxSgyjFjwv";

  const metadata = await getTokenMetaData(connection , mint);
  console.log(metadata);

})()
```

#### Response
```json
{
  "name": "Token NAME",
  "address": "7SLdnLCBDFEBAZvzdh9vGeuoZBD165ajKfAxSgyjFjwv",
  "symbol": "test",
  "image": "https://images.google.com/images/branding/googlelogo/1x/googlelogo_light_color_272x92dp.png",
  "extensions": {
    "website": "",
    "facebook": "",
    "twitter": "",
    "github": "",
    "discord": "",
    "telegram": ""
  }
}
```
