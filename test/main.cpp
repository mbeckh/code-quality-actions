int called_always() {
#ifdef _DEBUG
	const char sz[] = "Debug";   // testing: deliberate error for clang-tidy
#else
	const char sz[] = "Release"; // testing: deliberate error for clang-tidy
#endif
	return sz[0];
}

int called_optional() {  // testing: no coverage
	return 1;            // testing: no coverage
}                        // testing: no coverage

int main(int argc, char**) {
	int result = called_always() == 'Z' ? 1 : 0;
	if (argc > 1) {
		result += called_optional();  // testing: no coverage
	}
	return result;
}
