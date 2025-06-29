// src/lib/loadBestPractices.ts
import fs from "fs/promises";
import path from "path";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
/**
 * Return a single string that concatenates the 10 rubric-matching
 * sections from prompts/best_practices.md.
 */
export async function getBestPracticeSnippet(rubricKeys: string[]) {
  const mdPath = path.resolve("best_practices.md");
  const raw = await fs.readFile(mdPath, "utf-8");

  // split on "### " section headers
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1200,
    chunkOverlap: 0,
    separators: ["### "],
  });
  const docs = (await splitter.createDocuments([raw])).map((d) => ({
    ...d,
    metadata: { key: d.pageContent.match(/^([a-z_]+)/)?.[1] },
  }));

  const store = await MemoryVectorStore.fromDocuments(
    docs,
    new OpenAIEmbeddings()
  );

  const chunks: string[] = [];
  for (const key of rubricKeys) {
    const [top] = await store.similaritySearch(key, 1);
    if (top) chunks.push(top.pageContent.trim());
  }
  return chunks.join("\n\n");
}
