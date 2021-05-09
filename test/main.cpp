int called_always() {
	const char sz[] = "Test";
	return sz[0];
}

int called_optional() {
	return 1;
}

int main(int argc, char**) {
	int result = called_always() == 'T' ? 0 : 1;
	if (argc > 1) {
		result += called_optional();
	}
	return result;
}
