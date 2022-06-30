import { PublicKey } from '@solana/web3.js';
import { BinaryReader, BinaryWriter, deserializeUnchecked } from 'borsh';
import base58 from 'bs58';

export const extendBorsh = () => {
  (BinaryReader.prototype as any).readPubkey = function () {
    const reader = (this as unknown) as BinaryReader;
    const array = reader.readFixedArray(32);
    return new PublicKey(array);
  };

  (BinaryWriter.prototype as any).writePubkey = function (value: PublicKey) {
    const writer = (this as unknown) as BinaryWriter;
    writer.writeFixedArray(value.toBuffer());
  };

  (BinaryReader.prototype as any).readPubkeyAsString = function () {
    const reader = (this as unknown) as BinaryReader;
    const array = reader.readFixedArray(32);
    return base58.encode(array);
  };

  (BinaryWriter.prototype as any).writePubkeyAsString = function (
    value: any
  ): void {
    const writer = (this as unknown) as BinaryWriter;
    writer.writeFixedArray(base58.decode(value));
  };
};

extendBorsh();

const MetadataKey = {
  Uninitialized: 0,
  MetadataV1: 4,
  EditionV1: 1,
  MasterEditionV1: 2,
  MasterEditionV2: 6,
  EditionMarker: 7
};

export const METADATA_PREFIX = 'metadata';
export const EDITION = 'edition';
export const RESERVATION = 'reservation';
export const EDITION_MARKER_BIT_SIZE = 248;

export const findProgramAddress = async (seeds: any, programId: any) => {
  const key = `pda-${seeds.reduce(
    (agg: any, item: any) => agg + item.toString('hex'),
    ''
  )}${programId.toString()}`;
  const cached = localStorage.getItem(key);
  if (cached) {
    const value = JSON.parse(cached);

    return [new PublicKey(value.key), parseInt(value.nonce)];
  }
  const result = await PublicKey.findProgramAddress(seeds, programId);
  localStorage.setItem(
    key,
    JSON.stringify({
      key: result[0].toBase58(),
      nonce: result[1]
    })
  );
  return result;
};

export const decodeMetadata = (buffer: any) => {
  let metadata;
  try {
    metadata = deserializeUnchecked(METADATA_SCHEMA, Metadata, buffer);
  } catch {
    return;
  }
  return metadata;
};

async function getEdition(tokenMint: any) {
  const PROGRAM_IDS = programIds();

  return (
    await findProgramAddress(
      [
        Buffer.from(METADATA_PREFIX),
        PROGRAM_IDS.metadata.toBuffer(),
        tokenMint.toBuffer(),
        Buffer.from(EDITION)
      ],
      PROGRAM_IDS.metadata
    )
  )[0];
}

export class Metadata {
  [x: string]: any;
  constructor(args: any) {
    this.key = MetadataKey.MetadataV1;
    this.updateAuthority = args.updateAuthority;
    this.mint = args.mint;
    this.data = args.data;
    this.primarySaleHappened = args.primarySaleHappened;
    this.isMutable = args.isMutable;
  }

  async init() {
    const edition = await getEdition(this.mint);
    this.edition = edition;
    this.masterEdition = edition;
  }
}

export class MasterEditionV1 {
  [x: string]: number;
  constructor(args: any) {
    this.key = MetadataKey.MasterEditionV1;
    this.supply = args.supply;
    this.maxSupply = args.maxSupply;
    this.printingMint = args.printingMint;
    this.oneTimePrintingAuthorizationMint =
      args.oneTimePrintingAuthorizationMint;
  }
}

export class MasterEditionV2 {
  [x: string]: any;
  constructor(args: any) {
    this.key = MetadataKey.MasterEditionV2;
    this.supply = args.supply;
    this.maxSupply = args.maxSupply;
  }
}

class CreateMetadataArgs {
  [x: string]: any;
  constructor(args: any) {
    this.data = args.data;
    this.isMutable = args.isMutable;
  }
}
class UpdateMetadataArgs {
  [x: string]: any;
  constructor(args: any) {
    this.data = args.data ? args.data : null;
    this.updateAuthority = args.updateAuthority
      ? new PublicKey(args.updateAuthority)
      : null;
    this.primarySaleHappened = args.primarySaleHappened;
  }
}

class CreateMasterEditionArgs {
  [x: string]: any;
  constructor(args: any) {
    this.maxSupply = args.maxSupply;
  }
}

class MintPrintingTokensArgs {
  [x: string]: any;
  constructor(args: any) {
    this.supply = args.supply;
  }
}

export class EditionMarker {
  [x: string]: any;
  constructor(args: any) {
    this.key = MetadataKey.EditionMarker;
    this.ledger = args.ledger;
  }

  editionTaken(edition: any) {
    const editionOffset = edition % EDITION_MARKER_BIT_SIZE;
    const indexOffset = Math.floor(editionOffset / 8);

    if (indexOffset > 30) {
      throw new Error('bad index for edition');
    }

    const positionInBitsetFromRight = 7 - (editionOffset % 8);

    const mask = Math.pow(2, positionInBitsetFromRight);

    const appliedMask = this.ledger[indexOffset] & mask;

    return appliedMask !== 0;
  }
}

export class Edition {
  [x: string]: any;
  constructor(args: any) {
    this.key = MetadataKey.EditionV1;
    this.parent = args.parent;
    this.edition = args.edition;
  }
}
export class Creator {
  [x: string]: any;
  constructor(args: any) {
    this.address = args.address;
    this.verified = args.verified;
    this.share = args.share;
  }
}

export class Data {
  [x: string]: any;
  constructor(args: any) {
    this.name = args.name;
    this.symbol = args.symbol;
    this.uri = args.uri;
    this.sellerFeeBasisPoints = args.sellerFeeBasisPoints;
    this.creators = args.creators;
  }
}

export const METADATA_SCHEMA = new Map([
  [
    CreateMetadataArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['data', Data],
        ['isMutable', 'u8'] // bool
      ]
    }
  ],
  [
    UpdateMetadataArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['data', { kind: 'option', type: Data }],
        ['updateAuthority', { kind: 'option', type: 'pubkey' }],
        ['primarySaleHappened', { kind: 'option', type: 'u8' }]
      ]
    }
  ],

  [
    CreateMasterEditionArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['maxSupply', { kind: 'option', type: 'u64' }]
      ]
    }
  ],
  [
    MintPrintingTokensArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['supply', 'u64']
      ]
    }
  ],
  [
    MasterEditionV1,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['supply', 'u64'],
        ['maxSupply', { kind: 'option', type: 'u64' }],
        ['printingMint', 'pubkey'],
        ['oneTimePrintingAuthorizationMint', 'pubkey']
      ]
    }
  ],
  [
    MasterEditionV2,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['supply', 'u64'],
        ['maxSupply', { kind: 'option', type: 'u64' }]
      ]
    }
  ],
  [
    Edition,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['parent', 'pubkey'],
        ['edition', 'u64']
      ]
    }
  ],
  [
    Data,
    {
      kind: 'struct',
      fields: [
        ['name', 'string'],
        ['symbol', 'string'],
        ['uri', 'string'],
        ['sellerFeeBasisPoints', 'u16'],
        ['creators', { kind: 'option', type: [Creator] }]
      ]
    }
  ],
  [
    Creator,
    {
      kind: 'struct',
      fields: [
        ['address', 'pubkey'],
        ['verified', 'u8'],
        ['share', 'u8']
      ]
    }
  ],
  [
    Metadata,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['updateAuthority', 'pubkey'],
        ['mint', 'pubkey'],
        ['data', Data],
        ['primarySaleHappened', 'u8'], // bool
        ['isMutable', 'u8'] // bool
      ]
    }
  ],
  [
    EditionMarker,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['ledger', [31]]
      ]
    }
  ]
]);

export const WRAPPED_SOL_MINT = new PublicKey(
  'So11111111111111111111111111111111111111112'
);
export const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
);

export const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
);
export const BPF_UPGRADE_LOADER_ID = new PublicKey(
  'BPFLoaderUpgradeab1e11111111111111111111111'
);

export const METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
  // 'GCUQ7oWCzgtRKnHnuJGxpr5XVeEkxYUXwTKYcqGtxLv4',
);

export const MEMO_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
);

export const VAULT_ID = new PublicKey(
  'vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn'
  // '41cCnZ1Z1upJdtsS1tzFGR34cPFgJLzvJFmgYKpCqkz7',
);

export const AUCTION_ID = new PublicKey(
  'auctxRXPeJoc4817jDhf4HbjnhEcr1cCXenosMhK5R8'
  // '6u5XVthCStUfmNrYhFsST94oKxzwEZfZFHFhiCnB2nR1',
);

export const METAPLEX_ID = new PublicKey(
  'p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98'
  // '98jcGaKLKx9vv33H9edLUXAydrSipHhJGDQuPXBVPVGp',
);

export const SYSTEM = new PublicKey('11111111111111111111111111111111');

export const ENABLE_FEES_INPUT = false;

// legacy pools are used to show users contributions in those pools to allow for withdrawals of funds
export const PROGRAM_IDS = [
  {
    name: 'mainnet-beta'
  },
  {
    name: 'testnet'
  },

  {
    name: 'devnet'
  },
  {
    name: 'localnet'
  }
];

export const programIds = () => {
  return {
    token: TOKEN_PROGRAM_ID,
    associatedToken: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    bpf_upgrade_loader: BPF_UPGRADE_LOADER_ID,
    system: SYSTEM,
    metadata: METADATA_PROGRAM_ID,
    memo: MEMO_ID,
    vault: VAULT_ID,
    auction: AUCTION_ID,
    metaplex: METAPLEX_ID
  };
};
