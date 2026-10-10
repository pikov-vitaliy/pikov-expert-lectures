#include <cstdint>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

static std::vector<uint8_t> read_file(const std::string& path) {
    std::ifstream file(path, std::ios::binary);
    return std::vector<uint8_t>(
        std::istreambuf_iterator<char>(file),
        std::istreambuf_iterator<char>()
    );
}

static int parse_demo_format(const std::vector<uint8_t>& data) {
    if (data.size() < 5) {
        return 0;
    }

    if (data[0] != 'F' || data[1] != 'U' || data[2] != 'Z' || data[3] != '1') {
        return 0;
    }

    uint8_t declared_size = data[4];
    char name[16] = {};

    // Учебная ошибка: declared_size не проверяется относительно размера name.
    for (uint8_t i = 0; i < declared_size && 5 + i < data.size(); ++i) {
        name[i] = static_cast<char>(data[5 + i]);
    }

    if (name[0] == 'A' && name[1] == 'F' && name[2] == 'L') {
        std::cout << "interesting input\n";
    }

    return 0;
}

int main(int argc, char** argv) {
    if (argc != 2) {
        std::cerr << "usage: " << argv[0] << " <file>\n";
        return 1;
    }

    auto data = read_file(argv[1]);
    return parse_demo_format(data);
}