const str = ' (2 PINNED ITEMS) ---\n1. [Page 1 - Pin #2]: dfgdfgdf\n2. [Page 1 - Page Note]: dfgdfgdfg';
const regex = /\d+\.\s*\[([^\]]+)\]:\s*([\s\S]*?)(?=\n\d+\.\s*\[|$)/g;
let m;
while ((m = regex.exec(str)) !== null) {
  console.log('L:', m[1], 'T:', m[2]);
}
