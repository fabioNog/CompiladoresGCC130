import {
  contains,
  curry,
  find,
  filter,
  map,
  pipe,
  propEq,
  reduce,
  addIndex,
} from 'ramda';
// import { promisify } from 'util';
// import fs from 'fs';

import tst from './tst/tst';
import regexObj from '../utils/lexicalRegex';
import errorHelper from '../utils/errorHelper';

// Separa em linhas
const splitReaderToLines = content => content.toString().split('\n');

// to_char()
const toChar = content => map(line => line.split(' '))(content);


const checkTypeOfReserved = value => value.match('[a-zA-Z]+') ? 'WORD' : 'SIMBOL';

// const getReservedItens = () => {
//   return promisify(fs.readFile)('./utils/reservedWords.txt');
// };

const checkIfReserved = (value, table) => {
  const filteredValue =
    value[0] === '#' || value[0] === '@' ? value.slice(1) : value;
  const tstIndex = table.actionTable('C', filteredValue);
  const type = !!~tstIndex ? checkTypeOfReserved(filteredValue) : null;
  return { type, tst: tstIndex };
};

// Pega o tipo do token por regex
const getTypeByRegex = (item) => {
  const checkedByRegex = reduce((acc, regex) => {
    return item.match(regex) ? regexObj[regex] : acc;
  }, null)(Object.keys(regexObj));

  return checkedByRegex;
};

// ler_simbolo()
// Gera token
const readSimbol = (item, line, table) =>
  addIndex(map)((char, index) => {
    const typeOfChar = getTypeByRegex(char);
    const checkedReserved = checkIfReserved(char, table);
    const type = checkedReserved.type || typeOfChar;
    const position = `${line}:${index}`;
    const token = {
      value: char,
      type,
      tst: checkedReserved.tst,
      position,
    };
    return errorHelper.lexRegex(char, type, position) || token;
  })(item);

const generateToken = (filteredline, lineIndex, table) => {
  const token = readSimbol(filteredline, lineIndex, table);
  return token;
};

const removeTabsAndLF = arr =>
  filter(token => token.type !== ('LF' || 'tab'))(arr);

const filterSpaces = arr => arr.filter(item => item !== '');
// const filterSpaces = arr => arr.filter((item, i, arr) => arr[i - 1] !== ' ' || item !== ' ');

const filterSingleComments = (arr) => {
  const index = arr.indexOf('//');
  return !!~index ? arr.splice(0, index) : arr;
};

const filterLine = line => pipe(filterSpaces, removeTabsAndLF, filterSingleComments)(line);

const tokenize = (arr, table) =>
  addIndex(reduce)(
    (acc, line, lineIndex) => {
      // começa processo de ler simbolos
      if (contains('%{', line)) {
        acc.deps = ' %{';
        const index = arr.indexOf('%{');
      }
      if (contains('%}', line)) {
        acc.deps === '%{'
          ? (acc.deps = null)
          : errorHelper.lexError('%}', 'comment', `${lineIndex}`);
      }
      const filteredline = filterLine(line);

      const tokenAcc = {
        tokens: [generateToken(filteredline, lineIndex, table), ...acc.tokens],
        deps: acc.deps,
      };
      return tokenAcc;
    },
    { tokens: [], deps: null },
  )(arr).tokens;

const flatToken = lines => [].concat(...lines);

const readLines = async (info, arr) => {
  const table = await tst.createPopulatedTable();
  const tokenizer = tokenize(arr, table);

  const tokens = flatToken(tokenizer);
  info === '#list_tst' && table.printTable();

  const lexError = find(propEq('error', true))(tokens);
  lexError || errorHelper.successPrinter('léxicos');
  return lexError ? { error: 'lexical' } : { tokens, table };
};

const lexan = (info, file) => {
  return pipe(splitReaderToLines, toChar, curry(readLines)(info))(file);
};

export default curry(lexan);
