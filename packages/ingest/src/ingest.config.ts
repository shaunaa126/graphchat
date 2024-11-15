import { makeIngestMetaStore, Config } from "mongodb-rag-ingest";
import {
  makeOpenAiEmbedder,
  makeMongoDbEmbeddedContentStore,
  makeMongoDbPageStore,
} from "mongodb-rag-core";
import { standardChunkFrontMatterUpdater } from "mongodb-rag-ingest/embed";
import path from "path";
import { loadEnvVars } from "./loadEnvVars";
import { persistedQueryDataSource } from "./persistedQueryDataSource";
import { Client } from "pg";
import { makePgVectorEmbeddedContentStore, makePgVectorPageStore, makePgVectorIngestMetaStore } from "pgvector";

// Load project environment variables
const dotenvPath = path.join(__dirname, "..", "..", "..", ".env"); // .env at project root
const {
  MONGODB_CONNECTION_URI,
  MONGODB_DATABASE_NAME,
  OPENAI_API_KEY,
  OPENAI_EMBEDDING_MODEL,
  PG_CONNECTION_URI,
  PG_DATABASE_NAME,
  PG_VECTOR_TABLE_NAME,
} = loadEnvVars(dotenvPath);

export default {
  embedder: async () => {
    // Use dynamic import because `@azure/openai` is a ESM package
    // and this file is a CommonJS module.
    const { OpenAIClient, OpenAIKeyCredential } = await import("@azure/openai");
    return makeOpenAiEmbedder({
      openAiClient: new OpenAIClient(new OpenAIKeyCredential(OPENAI_API_KEY)),
      deployment: OPENAI_EMBEDDING_MODEL,
      backoffOptions: {
        numOfAttempts: 25,
        startingDelay: 1000,
      },
    });
  },
  embeddedContentStore: () => {
    if (PG_CONNECTION_URI && PG_DATABASE_NAME && PG_VECTOR_TABLE_NAME) {
      return makePgVectorEmbeddedContentStore({
        connectionUri: PG_CONNECTION_URI,
        databaseName: PG_DATABASE_NAME,
        tableName: PG_VECTOR_TABLE_NAME,
      });
    } else {
      return makeMongoDbEmbeddedContentStore({
        connectionUri: MONGODB_CONNECTION_URI,
        databaseName: MONGODB_DATABASE_NAME,
      });
    }
  },
  pageStore: () => {
    if (PG_CONNECTION_URI && PG_DATABASE_NAME && PG_VECTOR_TABLE_NAME) {
      return makePgVectorPageStore({
        connectionUri: PG_CONNECTION_URI,
        databaseName: PG_DATABASE_NAME,
        tableName: PG_VECTOR_TABLE_NAME,
      });
    } else {
      return makeMongoDbPageStore({
        connectionUri: MONGODB_CONNECTION_URI,
        databaseName: MONGODB_DATABASE_NAME,
      });
    }
  },
  ingestMetaStore: () => {
    if (PG_CONNECTION_URI && PG_DATABASE_NAME && PG_VECTOR_TABLE_NAME) {
      return makePgVectorIngestMetaStore({
        connectionUri: PG_CONNECTION_URI,
        databaseName: PG_DATABASE_NAME,
        tableName: PG_VECTOR_TABLE_NAME,
        entryId: "all",
      });
    } else {
      return makeIngestMetaStore({
        connectionUri: MONGODB_CONNECTION_URI,
        databaseName: MONGODB_DATABASE_NAME,
        entryId: "all",
      });
    }
  },
  chunkOptions: () => ({
    transform: standardChunkFrontMatterUpdater,
  }),
  // Add data sources here
  dataSources: async () => [
    await persistedQueryDataSource(),
  ],
} satisfies Config;
