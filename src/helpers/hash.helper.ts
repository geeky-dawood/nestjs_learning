import argon2 from 'argon2';

async function hashpassword(password: string) {
  try {
    const hash = await argon2.hash(password);
    return hash;
  } catch (err) {
    console.error('Error hashing password:', err);
    throw err;
  }
}

async function verifyHashPassword(hash: string, password: string) {
  try {
    if (await argon2.verify(hash, password)) {
      // password match
      return true;
    } else {
      // password did not match
      return false;
    }
  } catch (error) {
    // internal failure
    console.log(error);
    throw error;
  }
}

export { hashpassword, verifyHashPassword };
