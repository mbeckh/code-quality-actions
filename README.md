# code-quality-actions
GitHub actions for calculating and managing static analysis and code metrics for C++.

[![Release](https://img.shields.io/github/v/tag/mbeckh/code-quality-actions?label=Release&style=flat-square)](https://github.com/mbeckh/code-quality-actions/releases/)
[![Tests](https://img.shields.io/github/workflow/status/mbeckh/code-quality-actions/test/master?label=Tests&logo=GitHub&style=flat-square)](https://github.com/mbeckh/code-quality-actions/actions)
[![License](https://img.shields.io/github/license/mbeckh/code-quality-actions?label=License&style=flat-square)](https://github.com/mbeckh/code-quality-actions/blob/master/LICENSE)

## Features
-   Run an executable with [OpenCppCoverage](https://github.com/OpenCppCoverage).
-   Optionally send code coverage data to [Codecov](https://about.codecov.io) and [Codacy](https://www.codacy.com).
-   Send [clang-tidy](https://clang.llvm.org/extra/clang-tidy/) reports to [Codacy](https://www.codacy.com).

Sample results for this project's test project:

[![Coverage](https://img.shields.io/codecov/c/gh/mbeckh/code-quality-actions/master?label=Coverage&logo=codecov&style=flat-square)](https://codecov.io/gh/mbeckh/code-quality-actions)
[![Codacy Grade](https://img.shields.io/codacy/grade/ee98f11eca8c4a7fbeaf72006dbec9a5?label=Code%20Quality&logo=codacy&style=flat-square)](https://www.codacy.com/gh/mbeckh/code-quality-actions/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=mbeckh/code-quality-actions&amp;utm_campaign=Badge_Grade)
[![Codacy Coverage](https://img.shields.io/codacy/coverage/ee98f11eca8c4a7fbeaf72006dbec9a5?label=Coverage&logo=codacy&style=flat-square)](https://www.codacy.com/gh/mbeckh/code-quality-actions/dashboard?utm_source=github.com&utm_medium=referral&utm_content=mbeckh/code-quality-actions&utm_campaign=Badge_Coverage)

The actions are tested on Windows runners only.

## Get Coverage
Run a coverage analysis on a custom command and store the report in `coverage-<repository name>.xml` in the binary
directory.

For the time being, all coverage reports are sent for the language `CPP` to Codacy because else the service either
ignores headers or source files. If required, an enhancement can be made to allow configuration for language argument.

The latest version of [OpenCppCoverage](https://github.com/OpenCppCoverage/OpenCppCoverage) is automatically downloaded
from Github. For unpacking the installer, the action uses the latest version of
[innoextract](https://github.com/dscharrer/innoextract).

Example:
~~~yml
    - name: Coverage
      uses: mbeckh/code-quality-actions/coverage@master
      with:
        command: ctest
        source-dir: my-project
        binary-dir: build
        codecov: true
        codacy-token: ${{secrets.CODACY_PROJECT_API_TOKEN}}
        github-token: ${{secrets.GITHUB_TOKEN}}
~~~

### Inputs for `coverage`
-   `command` - The command to run (optional, defaults to `ctest --output-on-failure`).

-   `source-dir` - The root source directory such as `CMAKE_SOURCE_DIR`
    (optional, defaults to GitHub workspace directory).

-   `binary-dir` - The root binary directory such as `CMAKE_BINARY_DIR`
    (optional, defaults to GitHub workspace directory).

-   `codecov` - Set to `true` to send coverage data to [Codecov](https://about.codecov.io)
    (optional, defaults to `false`).

-   `codacy-token` - The value of the Codacy.com project API token to send data to Codacy
    (optional, defaults to not send to Codacy).

-   `github-token` - The value of the GitHub API token (required).

## Report clang-tidy Results
Send [clang-tidy](https://clang.llvm.org/extra/clang-tidy/) results to [Codacy](https://www.codacy.com). The action
expects to find one or several files named `clang-tidy-*.log` in the binary directory.

Example:
~~~yml
    - name: Report
      uses: mbeckh/code-quality-actions/report@master
      with:
        source-dir: my-project
        binary-dir: build
        codacy-token: ${{secrets.CODACY_PROJECT_API_TOKEN}}
        github-token: ${{secrets.GITHUB_TOKEN}}
~~~

### Inputs for `report`
-   `mode` - Allows sending multiple log files, e.g. from different jobs, before sending the completion message.
     Use `partial` to send a partial result and `final` for the final commit message. `full` sends a single log file
     and commits immediately (optional, defaults to `full`).

-   `source-dir` - The root source directory such as `CMAKE_SOURCE_DIR`
    (optional, defaults to GitHub workspace directory, not used for mode `final`).

-   `binary-dir` - The root binary directory such as `CMAKE_BINARY_DIR`
    (optional, defaults to GitHub workspace directory, not used for mode `final`).

-   `codacy-token` - The value of the Codacy.com project API token (required).

-   `github-token` - The value of the GitHub API token (required).

## License
The code is released under the Apache License Version 2.0. Please see [LICENSE](LICENSE) for details and
[NOTICE](NOTICE) for the required information when using llamalog in your own work.

