function tar2folder (tarBuffer) {
  const tar = new DataView(tarBuffer);
  const folder = [];

  function parseString (pointer, length) {
    const bytes = [];
    for (let i = 0; i < length; i++) {
      const char = tar.getUint8(pointer + i);
      if (char) {
        bytes.push(char);
      }
    }
    return String.fromCharCode(...bytes);
  }

  function parseOct (pointer, length) {
    const octString = parseString(pointer, length);
    return parseInt(octString, 8);
  }

  function parseFile (pointer) {
    const file = {};
    //Parse header
    file.name = parseString(pointer, 100);
    file.size = parseOct(pointer + 124, 12);
    file.lastModifiedTime = new Date(parseOct(pointer + 136, 12) * 1000);
    /*
    // unneeded headers
    file.uname = parseString(pointer + 265, 32)
    file.gname = parseString(pointer + 297, 32)
    file.devmajor = parseOct(pointer + 329, 8)
    file.devminor = parseOct(pointer + 337, 8)
    file.mode = parseOct(pointer + 100, 8)
    file.uid = parseOct(pointer + 108, 8)
    file.gid = parseOct(pointer + 116, 8)
    */

    //Parse content
    file.content = tarBuffer.slice(pointer + 512,pointer + 512 + file.size);

    folder.push(file);
    const fillerBytes = 512 - (file.size % 512);
    return pointer + 512 + file.size + fillerBytes;
  }

  let pointer = 0;
  while ( pointer < tar.byteLength - 1024) {
    pointer = parseFile(pointer);
  }
  console.log('folder is ', folder);
  return folder;
}

function folder2tar (folder) {
  let tarLength = 0;
  folder.map(file => {
    const fillerBytes = 512 - (file.content.length % 512);
    tarLength += 512 + file.content.length + fillerBytes;
  });
  tarLength += 1024;

  const tarBuffer = new ArrayBuffer(tarLength);
  const tarDataView = new DataView(tarBuffer);
  let pointer = 0;
  for (const file of folder) {
    console.log(`putting file  ${file.fileName} into the tar`);
    for (let i = 0; i < file.fileName.length; i++) {
      tarDataView.setUint8(pointer + i, file.fileName.charAt(i));
    }
    const sizeString = ('0000000000000000' + file.content.length.toString(8)).slice(-12);
    for (let i = 0; i < sizeString.length; i++) {
      tarDataView.setUint8(pointer + 124 + i, sizeString.charAt(i));
    }
    for (let i = 0; i < file.content.length; i++) {
      tarDataView.setUint8(pointer + 512 + i, file.content.charAt(i));
    }
    const fillerBytes = 512 - (file.content.length % 512);
    pointer = pointer + 512 + file.size + fillerBytes;
  }

  return tarBuffer;
}

module.exports = {
  tar2folder,
  folder2tar,
};
