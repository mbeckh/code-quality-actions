int called_always() {
#ifdef _DEBUG
	const char sz[] = "Debug";
#else
	const char sz[] = "Release";
#endif
	return sz[0];
}

int called_optional() {
	return 1;
}

int main(int argc, char**) {
	int result = called_always() == 'Z' ? 1 : 0;
	if (argc > 1) {
		result += called_optional();
	}
	return result;
}
