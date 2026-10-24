#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultTemplatePath = resolve(
  repositoryRoot,
  'infra/cdk.out/pipeline/BitebookPipeline.template.json',
);
const defaultSnapshotPath = resolve(
  repositoryRoot,
  'infra/pipeline-structure.json',
);
const nonStructuralProperties = new Set([
  'DisableInboundStageTransitions',
  'RestartExecutionOnUpdate',
  'Tags',
]);

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, child]) => [key, sortKeys(child)]),
  );
}

export function extractPipelineStructure(template) {
  const pipelines = Object.entries(template.Resources ?? {})
    .filter(([, resource]) => resource.Type === 'AWS::CodePipeline::Pipeline');

  if (pipelines.length !== 1) {
    throw new Error(
      `Expected exactly one AWS::CodePipeline::Pipeline resource; found ${pipelines.length}`,
    );
  }

  const [logicalId, pipeline] = pipelines[0];
  const properties = Object.fromEntries(
    Object.entries(pipeline.Properties ?? {})
      .filter(([name]) => !nonStructuralProperties.has(name)),
  );

  return sortKeys({ LogicalId: logicalId, Properties: properties });
}

export function serializePipelineStructure(template) {
  return `${JSON.stringify(extractPipelineStructure(template), null, 2)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const check = args[0] === '--check';
  const paths = check ? args.slice(1) : args;
  const templatePath = resolve(paths[0] ?? defaultTemplatePath);
  const snapshotPath = resolve(paths[1] ?? defaultSnapshotPath);
  const template = JSON.parse(await readFile(templatePath, 'utf8'));
  const expected = serializePipelineStructure(template);

  if (check) {
    let actual;
    try {
      actual = await readFile(snapshotPath, 'utf8');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }

    if (actual !== expected) {
      console.error(
        'infra/pipeline-structure.json does not match the synthesized CodePipeline declaration.',
      );
      console.error('Run npm run update:pipeline-structure and commit the result.');
      process.exitCode = 1;
    }
    return;
  }

  await writeFile(snapshotPath, expected);
  console.log(`Updated ${snapshotPath}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
