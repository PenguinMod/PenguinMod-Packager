/**
 * Packager Compressor
 * Compresses various portions of the packager to make the file size smaller
 *
 * This is very experimental and easy to break under certain changes to any repository.
 * Additionally this should also be updated whenever a built-in extension imports a library
 * or whenever some major text is injected to the packaged project
 */

/**
 * Remove all default fonts from the packaged project. Saves ~2.5mb
 * @param {string} code, code that is generated for script.js
 * @returns {string}
 */
 export const removeDefaultFonts = (code) => {
  const fontObjectInd = code.indexOf('{"Sans Serif":');
  const fontObjectEnd = code.indexOf('}', fontObjectInd) + 1;
  const fontObj = code.substring(fontObjectInd, fontObjectEnd);

  const regex = /"([^"]+)"\s*:|([A-Za-z0-9_$]+)\s*:/g;
  let count = 0;
  while (regex.exec(fontObj)) count++;

  const search = code.substring(code.indexOf(',function(A,e)', fontObjectEnd), code.length);
  let offset = fontObjectEnd;
  for (var i = 0; i < count; i++) {
    const fontStart = search.indexOf('{', offset) + (i === 0 ? 16: 0);
    const prevEnd = search.indexOf('}', offset) + 1;
    offset = search.indexOf('}', prevEnd);
    code = code.replace(search.substring(fontStart + 1, offset), '');
  }
  return code;
};

/**
 * Remove various parts of the packaged project, including unused extension libraries,
 * unused built-in extensions, extension image files, etc. Saves ~2mb as of right now
 * @param {string} code, code that is generated for script.js
 * @param {object} options, packager options
 * @returns {string}
 */
export const optiCompress = (code, options) => {
  const builtIns = options.project.analysis.builtInExts;
  const BLANK_PACK = 'function(A,e,t){},';

  /* remove some lingering vm comments/spacing */
  const vmCommentSec = code.indexOf('+="let stuckCounter = 0;');
  const vmCommentSecEnd = code.indexOf('("executeInCompatibilityLayer")&&!e.includes("const waitPromise")');
  const vmCompiler = code.substring(vmCommentSec, vmCommentSecEnd);
  const vmCompilerCleansed = vmCompiler.replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/[\r\n]+\s*/g, '').replace(/\s{2,}/g, ' ');
  code = code.replace(vmCompiler, vmCompilerCleansed);

  /* remove translate extension json map if not used */
  if (
    !builtIns.includes('translate') ||
    !builtIns.includes('text2speech')
  ) {
    code = code.replace(/JSON\.parse\('(?:(?!'\)).)*?"menuMap".*?'\)/gs, '{menuMap:{}}');
  }

  /* remove music extension audio urls if not used */
  if (!builtIns.includes('music')) {
    code = code.replace(/A\.exports\s*=\s*\{\s*"drums\/1-snare\.mp3"[\s\S]*?\}\s*,?/g, "");
  }

  /* remove threeJS Library if not used */
  if (!builtIns.includes('fr3d') || !builtIns.includes('jg3d')) {
    const threeInd = code.indexOf('function(A,e,t){"use strict";t.r(e),t.d(e,"ACESFilmicToneMapping"');
    const nextWorkerInd = code.indexOf('window.__THREE__=');
    if (threeInd > 0 && nextWorkerInd > 0) {
      code = code.substring(0, threeInd) + code.substring(nextWorkerInd + 20, code.length);
    }

    const threeUtilsStart = code.indexOf('"deepCloneAttribute",(function(){');
    const threeUtilsEnd = code.indexOf('THREE.BufferGeometryUtils: mergeBufferAttributes() has been renamed to mergeAttributes()');
    if (threeUtilsStart > 0 && threeUtilsEnd > 0) {
      code = code.substring(0, threeUtilsStart - 42) + code.substring(threeUtilsEnd + 98, code.length);
    }

    const objLoaderInd = code.indexOf('t.r(e),t.d(e,"OBJLoader",(function(){') - 29;
    const objLoaderEnd = code.indexOf('t.r(e),t.d(e,"GLTFLoader",(function(){') - 29;
    if (objLoaderInd > 0 && objLoaderEnd > 0) {
      code = code.replace(code.substring(objLoaderInd, objLoaderEnd), BLANK_PACK);
    }

    const gltfLoaderInd = code.indexOf('t.r(e),t.d(e,"GLTFLoader",(function(){') - 29;
    const gltfLoaderEnd = code.indexOf('A.morphTargetsRelative=!0,A}))}') + 54;
    if (gltfLoaderInd > 0 && gltfLoaderEnd > 0) {
      code = code.replace(code.substring(gltfLoaderInd, gltfLoaderEnd), BLANK_PACK);
    }

    const fbxLoaderInd = code.indexOf('t.r(e),t.d(e,"FBXLoader",(function(){') - 29;
    const fbxLoaderEnd = code.indexOf('console.warn("THREE.FBXLoader: unsupported Euler Order: Spherical XYZ') + 394;
    if (fbxLoaderInd > 0 && fbxLoaderEnd > 0) {
      code = code.replace(code.substring(fbxLoaderInd, fbxLoaderEnd), BLANK_PACK);
    }

    const convLoaderInd = code.indexOf('t.r(e),t.d(e,"ConvexGeometry",(function(){') - 29;
    const convLoaderRegex = /this\.setAttribute\("([^"]+)",\s*new\s+([a-zA-Z_$][\w$]*)\.Float32BufferAttribute\(\s*([a-zA-Z_$][\w$]*),\s*3\s*\)\)/;
    const match = convLoaderRegex.exec(code);
    const convLoaderEnd = (match ? match.index : -999) + 128;
    if (convLoaderInd > 0 && convLoaderEnd > 0) {
      code = code.replace(code.substring(convLoaderInd, convLoaderEnd), BLANK_PACK);
    }
  }

  /* remove matter-js library if not used */
  if (!builtIns.includes('jwPsychic')) {
    const matterInd = code.indexOf('* matter-js') - 35;
    const matterEnd = code.indexOf('.addConstraint}])},A.exports=t()}).call(this,t(') + 52;
    if (matterInd > 0 && matterEnd > 0) {
      code = code.replace(code.substring(matterInd, matterEnd), 'function(A,e,t){}');
    }
  }

  /* remove expanta-num library if not used */
  if (!builtIns.includes('jwNum')) {
    const expNumInd = code.indexOf('serializeMode:0,debug:0},o="[ExpantaNumError]') - 66;
    const expRegex = /for\(var\s+([a-zA-Z_$][\w$]*)\s+in\s+([a-zA-Z_$][\w$]*)\.prototype=([a-zA-Z_$][\w$]*),\2\.JSON=0,\2\.STRING=1,\2\.NONE=0,\2\.NORMAL=1,\2\.ALL=2,\2\.clone=([a-zA-Z_$][\w$]*),\2\.config=\2\.set=/;
    const match = expRegex.exec(code);
    const expNumEnd = (match ? match.index : -999) + 378;
    if (expNumInd > 0 && expNumEnd > 0) {
      code = code.replace(code.substring(expNumInd, expNumEnd), BLANK_PACK);
    }
  }

  /* remove unused built-in extensions */
  const getExtWrapper = (extCode, id) => {
    const classIndex = code.indexOf(extCode);
    const before = code.slice(0, classIndex);

    const boundaryRegex = id === 'oddMessage' ? /},\s*function\s*\(\s*A\s*,\s*e\s*\)\s*{/g
      : /},\s*function\s*\(\s*A\s*,\s*e\s*,\s*t\s*\)\s*{/g;
    let match, start = -1;
    while ((match = boundaryRegex.exec(before)) !== null) {
      if (match.index < classIndex) start = match.index + 1;
    }
    if (start === -1) return extCode;

    const after = code.slice(classIndex + extCode.length);
    const endMatch = after.indexOf('},');
    if (endMatch === -1) return extCode;
    const end = classIndex + extCode.length + endMatch + 2;

    let wrapped = code.slice(start + 1, end);
    if (wrapped.includes('function(A,e){A.exports=class{')) {
      wrapped = wrapped.substring(0, wrapped.indexOf('function(A,e){A.exports=class{'));
    } else if (wrapped.includes('function(module,exports,__webpack_require__){')) {
      wrapped = wrapped.substring(0, wrapped.indexOf('function(module,exports,__webpack_require__){'));
    }
    return wrapped;
  };

  const getExtClasses = (extCode) => {
    const results = [];
    const classRegex = /class(?:\s+[a-zA-Z0-9_]+)?\s*\{/g;
    let match;
    while ((match = classRegex.exec(extCode)) !== null) {
      const startIndex = match.index;
      let braceInd = 1, i = classRegex.lastIndex;
      while (i < extCode.length && braceInd > 0) {
        if (extCode[i] === '{') braceInd++;
        else if (extCode[i] === '}') braceInd--;
        i++;
      }

      const classCode = extCode.slice(startIndex, i);
      if (classCode.includes('getInfo(){')) results.push(classCode);
    }
    return results;
  };

  const classes = getExtClasses(code);
  const idRegex = /getInfo\s*\(\)\s*{[^}]*?\bid\s*:\s*["'`]([^"'`]+)["'`]/;
  const extIds = [];
  for (var i = 0; i < classes.length; i++) {
    // extract the extensions ID to test for removal
    const match = classes[i].match(idRegex);
    if (match) {
      const idString = match[1];
      if (idString.includes('.')) extIds.push(idString.split('.')[0]);
      else extIds.push(idString);
    }
  }

  for (var i = 0; i < classes.length; i++) {
    const id = extIds[i];
    const ext = classes.find(e => (
      e.includes(`id:"${id}"`) || e.includes(`id:'${id}'`) ||
      e.includes(`return'${id}'`) || e.includes(`return"${id}"`)
    ));
    if (!ext) continue;
    if (!builtIns.includes(id)) {
      const wrap = getExtWrapper(ext, id);
      if (wrap.startsWith(BLANK_PACK)) continue;
      code = code.replace(wrap, BLANK_PACK);
    }
  }

  /* remove built-in extension images */
  code = code.replaceAll(/blockIconURI:"[^"]*"/g, 'blockIconURI:""');
  code = code.replaceAll(/menuIconURI:"[^"]*"/g, 'menuIconURI:""');

  /* squeeze out some extra bytes */
  const twExtrasIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path fill="none" stroke="#fff" stroke-width="11.51815371" d="M24.457 7.707a18.41 18.41 0 0 0-.365 2.31c-.02.224 0 .507.06.852.061.405.092.689.092.851 0 .527-.345.79-1.034.79-.446 0-.74-.131-.881-.395-.02-.446-.01-1.054.03-1.824.04-.912.061-1.52.061-1.824-.02 0-.05-.02-.091-.06a98.522 98.522 0 0 0-5.32.364c-.04.264-.04.588 0 .973l.122 1.094c-.081.629-.122 1.56-.122 2.797.061.527.091 2.786.091 6.779v2.219c0 .344.051.587.152.73h1.885c.77-.102 1.155.222 1.155.972 0 .446-.213.76-.638.942-.264.102-.73.122-1.399.061-.405-.04-.881-.05-1.428-.03-.75.101-1.662.182-2.736.243-1.094.06-1.763-.091-2.006-.456-.162-.243-.162-.496 0-.76.283-.446 1.023-.669 2.219-.669.628 0 .942-.172.942-.516 0-.183-.01-.355-.03-.517 0-.507.01-.953.03-1.338.06-1.094.06-2.634 0-4.62-.081-2.878-.05-5.462.091-7.752l-.09-.09c-.63.04-1.805.03-3.527-.031-.081 0-.7.04-1.854.121.283 1.946.446 3.334.486 4.165l-.06.82c-.021.305-.274.457-.76.457-.386 0-.71-.73-.973-2.19-.122-.87-.244-1.752-.365-2.644 0-.142-.071-.385-.213-.73-.122-.364-.39-.97-.39-1.152 0-.641.593-.489 1.363-.61.06 0 .162.01.304.03.142.02.243.03.304.03H17.1a57.098 57.098 0 0 0 5.411-.486c.122-.06.304-.121.547-.182.426-.04.79.06 1.095.304.304.223.405.547.304.972z"/><path fill="none" stroke="#ff4c4c" stroke-width="5.75909785" d="M24.333 7.71q-.244 1.065-.365 2.311-.03.335.06.851.092.608.092.851 0 .79-1.034.79-.669 0-.881-.394-.03-.67.03-1.824.06-1.368.06-1.824-.03 0-.09-.061-2.827.122-5.32.365-.06.395 0 .973l.122 1.094q-.122.942-.122 2.796.091.79.091 6.78v2.218q0 .517.152.73h1.885q1.155-.152 1.155.973 0 .668-.638.942-.396.152-1.399.06-.608-.06-1.428-.03-1.125.152-2.736.243-1.642.092-2.006-.456-.244-.364 0-.76.425-.668 2.219-.668.942 0 .942-.517 0-.274-.03-.517 0-.76.03-1.337.091-1.642 0-4.62-.122-4.317.091-7.752l-.091-.091q-.942.06-3.526-.03-.122 0-1.854.12.425 2.919.486 4.165l-.06.821q-.031.456-.76.456-.578 0-.974-2.189-.182-1.307-.364-2.644 0-.213-.213-.73-.182-.547-.182-.82 0-.76 1.155-.943.09 0 .304.03.212.03.304.03h7.538q2.797-.12 5.411-.485.182-.092.547-.183.639-.06 1.095.304.456.335.304.973z"/><path fill="#fff" d="M24.31 7.714q-.243 1.064-.365 2.31-.03.335.061.852.091.608.091.85 0 .791-1.033.791-.67 0-.882-.395-.03-.669.03-1.824.061-1.368.061-1.824-.03 0-.09-.06-2.828.121-5.32.364-.061.396 0 .973l.121 1.094q-.121.943-.121 2.797.09.79.09 6.779v2.219q0 .517.153.73h1.884q1.156-.153 1.156.972 0 .669-.639.942-.395.152-1.398.061-.608-.06-1.429-.03-1.125.152-2.736.243-1.641.091-2.006-.456-.243-.365 0-.76.426-.669 2.22-.669.941 0 .941-.516 0-.274-.03-.517 0-.76.03-1.338.092-1.641 0-4.62-.121-4.317.092-7.752l-.092-.09q-.942.06-3.526-.031-.121 0-1.854.121.426 2.919.486 4.165l-.06.82q-.03.457-.76.457-.578 0-.973-2.19-.182-1.306-.365-2.644 0-.212-.213-.73-.182-.546-.182-.82 0-.76 1.155-.942.091 0 .304.03t.304.03h7.539q2.796-.121 5.41-.486.183-.091.548-.182.638-.061 1.094.304.456.334.304.972z"/></svg>';
  const oldCheckMark = 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTIwLjc3MzU5NSA1LjcyODA1MTlhMS4zMDc3Nzc0IDEuMzA3Nzc3NCAwIDAgMC0xLjg1NzA0MyAwTDkuMTczNjEwNSAxNS40ODQwNzFsLTQuMDkzMzQzMi00LjEwNjQyYTEuMzM2NDQ2OCAxLjMzNjQ0NjggMCAxIDAtMS44NTcwNDM5IDEuOTIyNDMybDUuMDIxODY1MSA1LjAyMTg2NmExLjMwNzc3NzQgMS4zMDc3Nzc0IDAgMCAwIDEuODU3MDQ0NSAwTDIwLjc3MzU5NSA3LjY1MDQ4NDdhMS4zMDc3Nzc0IDEuMzA3Nzc3NCAwIDAgMCAwLTEuOTIyNDMyOHoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=';
  const optimizedCheckMark = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTIwLjc3NCA1LjcyOGExLjMxIDEuMzEgMCAwIDAtMS44NTcgMGwtOS43NDMgOS43NTYtNC4wOTQtNC4xMDZBMS4zMzYgMS4zMzYgMCAxIDAgMy4yMjMgMTMuM2w1LjAyMiA1LjAyMmExLjMxIDEuMzEgMCAwIDAgMS44NTcgMEwyMC43NzQgNy42NWExLjMxIDEuMzEgMCAwIDAgMC0xLjkyMiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==';
  code = code.replace(oldCheckMark, optimizedCheckMark).replace(twExtrasIcon, '');

  const imageURIs = code.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g);
  if (imageURIs) for (var i = 1; i < imageURIs.length; i++) {
    if ((i === 15 || i === 16) && !builtIns.includes('fr3d')) code = code.replace(imageURIs[i], '');
    else if (i < 15 || i > 16) code = code.replace(imageURIs[i], '');
  }

  /* these are always false */
  code = code.replace('c.has("livetests";', 'false;')
    .replace('String(window.location.href).startsWith("http://localhost:"),', 'false,');
  return code;
};
