import { createInterface } from "node:readline";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { outlineSchema } from "./types.js";
import type { Outline, Domain } from "./types.js";

export type ReviewAction = "accept" | "edit" | "rerun" | "abort";

type SubConcept = {
  name: string;
  description: string;
  files: { path: string; role: string }[];
  sub_concepts?: SubConcept[];
};

function printSubConcepts(subs: SubConcept[], indent: string): void {
  for (const sub of subs) {
    console.log(`${indent}${chalk.yellow(sub.name)} — ${sub.description}`);
    for (const f of sub.files) {
      console.log(`${indent}  ${chalk.dim(f.path)} (${f.role})`);
    }
    if (sub.sub_concepts) {
      printSubConcepts(sub.sub_concepts, indent + "  ");
    }
  }
}

function printDomain(domain: Domain, index: number): void {
  const fileCount = domain.files.length;
  console.log(
    `\n  ${chalk.bold.cyan(`${index + 1}. ${domain.title}`)} ${chalk.dim(`(${fileCount} files)`)}`,
  );
  console.log(`     ${domain.description}`);

  for (const f of domain.files) {
    console.log(`     ${chalk.dim(f.path)} (${f.role})`);
  }

  if (domain.sub_concepts) {
    printSubConcepts(domain.sub_concepts, "       ");
  }
}

function printOutline(outline: Outline): void {
  console.log(
    chalk.bold(`\nProject: ${outline.project_name}`),
  );
  console.log(`Summary: ${outline.summary}`);
  console.log(`Stack: ${outline.detected_stack.join(", ")}`);
  console.log(
    chalk.bold(`\nKnowledge Domains (${outline.knowledge_graph.length}):`),
  );

  for (let i = 0; i < outline.knowledge_graph.length; i++) {
    printDomain(outline.knowledge_graph[i], i);
  }

  if (outline.ignored_files.length > 0) {
    console.log(chalk.dim(`\nIgnored files: ${outline.ignored_files.length}`));
  }
}

function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function saveOutline(outline: Outline, outputDir: string): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const outlinePath = path.join(outputDir, "outline.json");
  await writeFile(outlinePath, JSON.stringify(outline, null, 2), "utf-8");
  return outlinePath;
}

/**
 * Display outline as a colored tree in the terminal and prompt for user action.
 */
export async function reviewOutline(
  outline: Outline,
  outputDir: string,
): Promise<{ action: ReviewAction; outline: Outline }> {
  printOutline(outline);

  console.log(chalk.bold("\nWhat would you like to do?"));
  console.log("  [1] Accept — proceed to document generation");
  console.log("  [2] Edit   — save outline JSON and edit manually");
  console.log("  [3] Re-run — re-run exploration agent");
  console.log("  [4] Abort  — stop and keep outline file");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const answer = await prompt("\nYour choice (1/2/3/4): ");

    switch (answer) {
      case "1": {
        const savedPath = await saveOutline(outline, outputDir);
        console.log(chalk.green(`Outline saved to ${savedPath}`));
        return { action: "accept", outline };
      }

      case "2": {
        const savedPath = await saveOutline(outline, outputDir);
        console.log(chalk.yellow(`Outline saved to ${savedPath}`));
        console.log("Edit the file, then press Enter to continue...");
        await prompt("");

        // Reload and validate
        const raw = await readFile(savedPath, "utf-8");
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          console.error(chalk.red("Invalid JSON syntax in edited file."));
          continue;
        }

        const result = outlineSchema.safeParse(parsed);
        if (!result.success) {
          const issues = result.error.issues
            .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
            .join("\n");
          console.error(chalk.red(`Validation failed:\n${issues}`));
          console.log("Please fix the errors and try again.");
          continue;
        }

        console.log(chalk.green("Edited outline is valid."));
        return { action: "accept", outline: result.data };
      }

      case "3": {
        await saveOutline(outline, outputDir);
        return { action: "rerun", outline };
      }

      case "4": {
        const savedPath = await saveOutline(outline, outputDir);
        console.log(chalk.yellow(`Outline preserved at ${savedPath}`));
        return { action: "abort", outline };
      }

      default:
        console.log(chalk.red("Invalid choice. Please enter 1, 2, 3, or 4."));
    }
  }
}
