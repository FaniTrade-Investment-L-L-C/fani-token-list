

## Adding a New Token

Under development the next release will be in few hours

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
import React, { useState, useEffect } from "react";

import { TokenInfo, TokenListProvider , getTokenMetaData } from "@fanitrade/fani-solana-tokenlist";

export const TokenMetaData = ({ mint: string }) => {
  const [tokenMap, setTokenMap] = useState(new Map());
  const [metadata, setMetaData] = useState([]);

  useEffect(() => {
    new TokenListProvider().resolve().then((tokens) => {

      const tokenList = tokens.filterByChainId(101).getList();
      setTokenMap(
        tokenList.reduce((map, item) => {
          map.set(item.address, item);
          return map;
          1;
        }, new Map())
      );
    });
  }, [setTokenMap]);

  useEffect(() => {
    loadMetaData();
  }, []);

  const token = tokenMap.get(mint);
  const loadMetaData = async () => {
    const meta = await getTokenMetaData(props.mint);
    setMetaData(meta);
  };
  let name = "";

  if (token) {
    name += token.name;
  }
  if (!token) {
    name += metadata.name
  }

  return (
    <>
      ... code
    </>
  );
};

```
