import z from 'zod';

const b32Alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUV";
const b32Mapping = Object.create(null);
for (let i = 0; i < b32Alphabet.length; i++) {
  b32Mapping[b32Alphabet[i]!] = BigInt(i);
}

// base32-str to base10-str
export const myInputId = z.string().nonempty().transform((inputStr) => {
  inputStr = inputStr.toUpperCase();

  let result = 0n;
  for (const ch of inputStr) {
    if (!(ch in b32Mapping)) {
      throw new SyntaxError(`Invalid Base-32 character “${ch}”`);
    }

    result = result * 32n + b32Mapping[ch];
  }

  return result.toString();
});

// base10-str to base32-str
export const myOutputId = z.string().nonempty().transform((value) => {
  return BigInt(value.toString()).toString(32).replace('=', '').toUpperCase();
});

export const myString = z.string().trim().nonempty();

export const myAddress = z.object({
  country: myString.nullish(),
  zip: myString.nullish(),
  city: myString,
  street_address: myString,
}).strict();
