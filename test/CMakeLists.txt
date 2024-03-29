# Minimal CMakeLists.txt for testing the actions
cmake_minimum_required(VERSION 3.19 FATAL_ERROR)

project("code-quality-actions-test" CXX)

add_compile_definitions("$<$<CONFIG:Debug>:_DEBUG=1>")
add_executable(${PROJECT_NAME} main.cpp)

find_program(clang-tidy_EXE clang-tidy REQUIRED)
add_custom_target(clang-tidy ALL
                  DEPENDS ${PROJECT_NAME} clang-tidy-${PROJECT_NAME}.log)

# very simple setup for clang-tidy just to generate some output for testing
add_custom_command(OUTPUT clang-tidy-${PROJECT_NAME}.log
                   COMMAND "${clang-tidy_EXE}"
                           -checks=-*,clang-analyzer-*,clang-diagnostic-*,modernize-avoid-c-arrays
                           "${CMAKE_SOURCE_DIR}/main.cpp" -- "$<$<CONFIG:Debug>:-D_DEBUG=1>"
                           > clang-tidy-${PROJECT_NAME}.log
                   DEPENDS "${CMAKE_SOURCE_DIR}/main.cpp")

enable_testing()
# Run executable to get coverage information
add_test(NAME ${PROJECT_NAME} COMMAND ${PROJECT_NAME})
