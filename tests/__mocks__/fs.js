const fs = jest.createMockFromModule('fs');

fs.existsSync = jest.fn();
fs.readFileSync = jest.fn();
fs.writeFileSync = jest.fn();
fs.promises = {
  access: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  rmdir: jest.fn()
};

module.exports = fs;