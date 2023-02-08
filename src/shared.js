/*
Copyright 2020-2021 Michael Beckh

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
'use strict';
const core = require('@actions/core');
const exec = require('@actions/exec');
const cache = require('@actions/cache');
const github = require('@actions/github');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const env = process.env;
const WORKSPACE_PATH = path.resolve(env.GITHUB_WORKSPACE);
const TEMP_PATH = path.join(WORKSPACE_PATH, '.mbeckh');

// Normalize functions do not change separators, so add additional version
function forcePosix(filePath) {
  return path.posix.normalize(filePath).replace(/\\/g, '/');
}

function forceWin32(filePath) {
  return path.win32.normalize(filePath).replace(/\//, '\\');
}

const forceNative = path.sep === '/' ? forcePosix : forceWin32;

function escapeRegExp(str) {
    return str.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}

async function saveCache(paths, key) {
  try {
    return await cache.saveCache(paths.map((e) => forcePosix(e)), key);
  } catch (error) {
    // failures in caching should not abort the job
    core.warning(error.message);
  }
  return null;
}

async function restoreCache(paths, key, altKeys) {
  try {
    return await cache.restoreCache(paths.map((e) => forcePosix(e)), key, altKeys);
  } catch (error) {
    // failures in caching should not abort the job
    core.warning(error.message);
  }
  return null;
}

async function setupOpenCppCoverage() {
  const toolPath = path.join(TEMP_PATH, 'OpenCppCoverage');

  core.startGroup('Installing OpenCppCoverage');
  // Install "by hand" because running choco on github is incredibly slow
  core.info('Getting latest release for OpenCppCoverage');

  const githubToken = core.getInput('github-token', { 'required': true });
  core.setSecret(githubToken);

  const octokit = github.getOctokit(githubToken);
  const { data: release } = await octokit.rest.repos.getLatestRelease({ 'owner':'OpenCppCoverage', 'repo': 'OpenCppCoverage' });
  const asset = release.assets.filter((e) => /-x64-.*\.exe$/.test(e.name))[0];
  const key = `opencppcoverage-${asset.id}`;

  if (await restoreCache([ toolPath ], key)) {
    core.info(`Found ${release.name} in ${toolPath}`);
  } else {
    {
      core.info('Getting latest release for innoextract');
      const { data: release } = await octokit.rest.repos.getLatestRelease({ 'owner':'dscharrer', 'repo': 'innoextract' });
      const asset = release.assets.filter((e) => /-windows\.zip$/.test(e.name))[0];
      core.info(`Downloading ${release.name} from ${asset.browser_download_url}`);

      const downloadFile = path.join(TEMP_PATH, asset.name);
      await exec.exec('curl', [ '-s', '-S', '-L', '-o', downloadFile, '--create-dirs', asset.browser_download_url ]);
      core.info('Unpacking innoextract');
      await exec.exec('7z', [ 'x', '-aos', `-o${TEMP_PATH}`, downloadFile, 'innoextract.exe' ]);
    }

    core.info(`Downloading ${release.name} from ${asset.browser_download_url}`);

    const downloadFile = path.join(TEMP_PATH, asset.name);
    await exec.exec('curl', [ '-s', '-S', '-L', '-o', downloadFile, '--create-dirs', asset.browser_download_url ]);
    core.info('Unpacking OpenCppCoverage');
    await exec.exec(path.join(TEMP_PATH, 'innoextract'), [ '-e', '-m', '--output-dir', toolPath, downloadFile ]);

    await saveCache([ toolPath ], key);
    core.info(`Installed ${release.name} at ${toolPath}`);
  }
  core.endGroup();
  const binPath = path.resolve(toolPath, 'app');
  core.addPath(binPath);
  return path.join(binPath, 'OpenCppCoverage.exe');
}

async function setupCodacyClangTidy() {
  const toolPath = path.join(TEMP_PATH, 'codacy-clang-tidy');

  core.startGroup('Installing codacy-clang-tidy');
  core.info('Getting latest release for codacy-clang-tidy');

  const githubToken = core.getInput('github-token', { 'required': true });
  core.setSecret(githubToken);

  const octokit = github.getOctokit(githubToken);
  const { data: release } = await octokit.rest.repos.getLatestRelease({ 'owner':'codacy', 'repo': 'codacy-clang-tidy' });
  const asset = release.assets.filter((e) => /\.jar$/.test(e.name))[0];
  const key = `codacy-clang-tidy-${asset.id}`;
  const toolFile = path.join(toolPath, asset.name);

  if (await restoreCache([ toolPath ], key)) {
    core.info(`Found codacy-clang-tidy ${release.tag_name} in cache at ${toolPath}`);
  } else {
    core.info(`Downloading codacy-clang-tidy ${release.tag_name} from ${asset.browser_download_url}`);

    await exec.exec('curl', [ '-s', '-S', '-L', '-o', toolFile, '--create-dirs', asset.browser_download_url ]);
    await saveCache([ toolPath ], key);
    core.info(`Downloaded codacy-clang-tidy ${release.tag_name} at ${toolPath}`);
  }
  core.endGroup();
  return toolFile;
}

async function setupCodacyCoverageScript() {
  const toolPath = path.join(TEMP_PATH, 'codacy-coverage-reporter');

  core.startGroup('Installing codacy-coverage-reporter');
  core.info('Getting latest release for codacy-coverage-reporter');

  const githubToken = core.getInput('github-token', { 'required': true });
  core.setSecret(githubToken);

  const octokit = github.getOctokit(githubToken);
  const { data: release } = await octokit.rest.repos.getLatestRelease({ 'owner':'codacy', 'repo': 'codacy-coverage-reporter' });
  const asset = release.assets.filter((e) => /\.jar$/.test(e.name))[0];

  const key = `codacy-coverage-reporter-${asset.id}`;
  const toolFile = path.join(toolPath, asset.name);

  if (await restoreCache([ toolPath ], key)) {
    core.info(`Found codacy-coverage-reporter ${release.tag_name} in cache at ${toolPath}`);
  } else {
    core.info(`Downloading codacy-coverage-reporter ${release.tag_name} from ${asset.browser_download_url}`);

    await exec.exec('curl', [ '-s', '-S', '-L', '-o', toolFile, '--create-dirs', asset.browser_download_url ]);
    await saveCache([ toolPath ], key);
    core.info(`Downloaded codacy-coverage-reporter ${release.tag_name} at ${toolPath}`);
  }
  core.endGroup();
  return toolFile;
}

function parseCommandLine(str) {
  // This absolute beast of a regular expression parses a command line.
  // Kudos to https://stackoverflow.com/questions/13796594/how-to-split-string-into-arguments-and-options-in-javascript
  const regex = /((?:"[^"\\]*(?:\\[\S\s][^"\\]*)*"|'[^'\\]*(?:\\[\S\s][^'\\]*)*'|\/[^\/\\]*(?:\\[\S\s][^\/\\]*)*\/[gimy]*(?=\s|$)|(?:\\\s|\S))+)(?=\s|$)/g;
  return [...str.matchAll(regex)].map((e) => e[1]);
}

// Get checkout root folder to build names relative to repository root
function getCheckoutPath(sourcePath) {
  let checkoutPath = sourcePath;
  while (checkoutPath !== WORKSPACE_PATH && !fs.existsSync(path.join(checkoutPath, '.git'))) {
    let previous = checkoutPath;
    checkoutPath = path.dirname(checkoutPath);
    if (checkoutPath === previous) {
      // abort if - for whatever reason - cannot traverse up
      throw new Error(`Cannot find repository root for ${sourcePath}, currently looking into ${checkoutPath}`);
    }
  }
  if (fs.existsSync(path.join(checkoutPath, '.git'))) {
    core.info(`Found Git repository at ${checkoutPath}`);
  } else {
    core.info(`Assume repository root as ${checkoutPath}`);
  }
  return checkoutPath;
}

exports.coverage = async function() {
  try {
    await setupOpenCppCoverage();

    const command = core.getInput('command', { 'required': true });
    const sourcePath = path.resolve(WORKSPACE_PATH, forceNative(core.getInput('source-dir', { 'required': true })));
    const binaryPath = path.resolve(WORKSPACE_PATH, forceNative(core.getInput('binary-dir', { 'required': true })));
    const codacyToken = core.getInput('codacy-token', { 'required': false });
    core.setSecret(codacyToken);

    const checkoutPath = getCheckoutPath(sourcePath);
    const codacyToolPath = codacyToken ? await setupCodacyCoverageScript() : null;

    core.startGroup(`Getting code coverage for ${command}`);

    const coverageFile = path.join(binaryPath, `coverage-${github.context.repo.repo}.xml`);
    const commandArray = parseCommandLine(command);

    await exec.exec('OpenCppCoverage', [
                    `--modules=${path.join(binaryPath, path.sep)}`,
                    `--excluded_modules=${path.join(binaryPath, 'vcpkg_installed', path.sep)}`,
                    `--sources=${path.join(sourcePath, path.sep)}`,
                    `--excluded_sources=${path.join(sourcePath, 'test', path.sep)}`,
                    sourcePath !== binaryPath ? `--excluded_sources=${path.join(binaryPath, path.sep)}` : null,
                    `--working_dir=${binaryPath}`,
                    '--cover_children',
                    `--export_type=cobertura:${coverageFile}`,
                    '--', ...commandArray ].filter((e) => e !== null), { 'cwd': binaryPath });

    // beautify file
    let data = fs.readFileSync(coverageFile, 'utf8');
    const root = /(?<=<source>).+?(?=<\/source>)/.exec(data)[0];
    const workspaceWithoutRoot = checkoutPath.substring(root.length).replace(/^[\\\/]/, ''); // remove Windows volume name and leading (back-) slashes

    data = data.replace(/(?<=<source>).+?(?=<\/source>)/, checkoutPath);
    data = data.replace(new RegExp(`(?<= name=")${escapeRegExp(path.join(binaryPath, path.sep))}`, 'g'), '');
    data = data.replace(new RegExp(`(?<= filename=")${escapeRegExp(path.join(workspaceWithoutRoot, path.sep))}`, 'g'), '');
    data = data.replace(/\\/g, '/');
    fs.writeFileSync(coverageFile, data);

    core.endGroup();

    if (codacyToolPath) {
      core.startGroup('Sending coverage to codacy');
      // use relative posix paths for bash
      const posixToolPath = forcePosix(path.relative(WORKSPACE_PATH, codacyToolPath));
      const posixCoverageFile = forcePosix(path.relative(WORKSPACE_PATH, coverageFile));
      const envCodacy = {
        'INPUT_COVERAGE_FILE': posixCoverageFile,
        'INPUT_CODACY_TOKEN': codacyToken
      };

      // Codacy requires language argument, else coverage is not detected
      await exec.exec('bash', [ '-c', `java -jar "${posixToolPath}" report -r "$INPUT_COVERAGE_FILE" -l CPP -t "$INPUT_CODACY_TOKEN" --commit-uuid "$GITHUB_SHA"` ],
                      { 'cwd': WORKSPACE_PATH,
                        'env': { ...env, ...envCodacy }});
      core.endGroup();
    }
  } catch (error) {
    core.setFailed(error.message);
  }
};

exports.report = async function() {
  try {
    const mode = core.getInput('mode', { 'required': true });
    const codacyToken = core.getInput('codacy-token', { 'required': true });
    core.setSecret(codacyToken);

    const sendResults = [ 'full', 'partial' ].includes(mode);
    const sendCommit = [ 'full', 'final' ].includes(mode);

    if (!sendResults && !sendCommit) {
      throw new Error(`Unknown mode '${mode}', available options are 'full', 'partial' and 'final`);
    }

    const toolPath = sendResults ? await setupCodacyClangTidy() : null;

    core.startGroup(`Sending ${mode} code analysis to codacy`);
    const envCodacy = {
      'INPUT_CODACY_TOKEN': codacyToken
    };
    if (sendResults) {
      // All commands run from checkout path. Use relative paths for all files because bash cannot handle drive letter in Windows paths.
      const sourcePath = path.resolve(WORKSPACE_PATH, forceNative(core.getInput('source-dir', { 'required': true })));
      const binaryPath = path.resolve(WORKSPACE_PATH, forceNative(core.getInput('binary-dir', { 'required': true })));

      const checkoutPath = getCheckoutPath(sourcePath);
      const posixBinaryPath = forcePosix(path.relative(checkoutPath, binaryPath));
      const posixToolPath = forcePosix(path.relative(checkoutPath, toolPath));
      const posixLogFile = forcePosix(path.relative(checkoutPath, path.join(TEMP_PATH, 'clang-tidy.json')));

      await exec.exec('bash', [ '-c', `find "${posixBinaryPath}" -maxdepth 1 -name 'clang-tidy-*.log' -exec cat "{}" \\; | java -jar "${posixToolPath}" | sed -r -e "s#[\\\\]{2}#/#g" > "${posixLogFile}"` ], { 'cwd': checkoutPath });
      await exec.exec('bash', [ '-c', `curl -s -S -X POST -L -H "project-token: $INPUT_CODACY_TOKEN" -H "Content-type: application/json" -w "\\n" -d "@${posixLogFile}" "https://api.codacy.com/2.0/gh/$GITHUB_REPOSITORY/commit/$GITHUB_SHA/issuesRemoteResults"` ],
                      { 'cwd': checkoutPath,
                        'env': { ...env, ...envCodacy }});
    }
    if (sendCommit) {
      await exec.exec('bash', [ '-c', 'curl -s -S -X POST -L -H "project-token: $INPUT_CODACY_TOKEN" -H "Content-type: application/json" -w "\\n" "https://api.codacy.com/2.0/gh/$GITHUB_REPOSITORY/commit/$GITHUB_SHA/resultsFinal"' ],
                      { 'cwd': WORKSPACE_PATH,
                        'env': { ...env, ...envCodacy }});
    }
    core.endGroup();
  } catch (error) {
    core.setFailed(error.message);
  }
};
