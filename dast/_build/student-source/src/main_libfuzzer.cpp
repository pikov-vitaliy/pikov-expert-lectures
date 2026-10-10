#include <cstdint>
#include <cstddef>
#include <iostream>

// Учебный формат входных данных:
//   bytes 0..3  : magic "FUZ1"
//   byte  4     : declared_size
//   bytes 5..N  : name
//
// В этом файле намеренно оставлена ошибка для демонстрации libFuzzer + ASan:
// declared_size не ограничивается размером локального буфера name.
static int parse_demo_format(const uint8_t* data, size_t size) {
    if (size < 5) {
        return 0;
    }

    if (data[0] != 'F' || data[1] != 'U' || data[2] != 'Z' || data[3] != '1') {
        return 0;
    }

    uint8_t declared_size = data[4];
    char name[16] = {};

    // Учебная ошибка: при declared_size > 16 возможна запись за пределы name.
    for (uint8_t i = 0; i < declared_size && 5 + i < size; ++i) {
        name[i] = static_cast<char>(data[5 + i]);
    }

    if (name[0] == 'L' && name[1] == 'I' && name[2] == 'B') {
        std::cout << "interesting libFuzzer input\n";
    }

    return 0;
}

extern "C" int LLVMFuzzerTestOneInput(const uint8_t* data, size_t size) {
    parse_demo_format(data, size);
    return 0;
}
