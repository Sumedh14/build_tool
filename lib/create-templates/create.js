import { select, input } from '@inquirer/prompts';
import fs from "node:fs/promises";
import path, { dirname } from "node:path";
import { fileURLToPath } from 'url';
import chalk from 'chalk';

export async function create(artifactPath, projectName) {
    if (!projectName) {
        console.error("Please specify a project name.");
        return;
    }
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const dir = path.resolve(artifactPath, projectName);
    const templateDir = path.join(__dirname, 'reactJs');

    try {
        await fs.stat(dir);
        console.error(chalk.red(`Directory '${dir}' already exists! Aborting.`));
        return;

    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(chalk.red("Error checking directory existence:"), error);
            return;
        }
    }

    try {

        const templateType = await select({
            message: 'Which type of template do you want?',
            choices: [
                { name: 'Standard (JS)', value: 'Standard (JS)' },
                { name: 'TypeScript', value: 'TypeScript' },
            ],
        });

        const projectName = await input({
            message: 'Enter the name of the project.',
            default: 'react-project',
            validate: (val) => val.trim() !== '' || 'Project name cannot be empty.',
        });

        const projectVersion = await input({
            message: 'Project Version:',
            default: '1.0.0',
        });

        const moduleType = await select({
            message: 'Which type of module?',
            choices: [
                { name: 'module', value: 'module' },
                { name: 'commonjs', value: 'commonjs' },
            ],
            default: 'module',
        });

        const projectDescription = await input({
            message: 'Description:',
            default: 'New React Project',
        });

        const answers = {
            templateType,
            projectName,
            projectVersion,
            moduleType,
            projectDescription
        };

        await fs.mkdir(dir);
        console.log(chalk.cyan(`\nCreating project in ${dir}...`));

        await fs.cp(templateDir, dir, { recursive: true });
        console.log(chalk.green('\n Base structure copied successfully.'));

        const basePackageJson = await fs.readFile(path.join(templateDir, 'package.json'), 'utf-8');
        const pkg = JSON.parse(basePackageJson);

        pkg.name = answers.projectName;
        pkg.type = answers.moduleType
        pkg.version = answers.projectVersion;
        pkg.description = answers.projectDescription;


        const destinationPath = path.join(dir, 'package.json')
        await fs.writeFile(destinationPath, JSON.stringify(pkg, null, 2));

    } catch (error) {
        console.error(chalk.red("Error during project creation or file handling:"), error);
    }

}