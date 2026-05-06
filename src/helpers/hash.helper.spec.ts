import argon2 from 'argon2';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { hashpassword, verifyHashPassword } from './hash.helper';

jest.mock('argon2', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
    verify: jest.fn(),
  },
}));

const mockArgon2 = argon2 as jest.Mocked<typeof argon2>;

describe('hash helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashpassword', () => {
    it('hashes a password', async () => {
      mockArgon2.hash.mockResolvedValue('hashed-password');

      await expect(hashpassword('Secret123')).resolves.toBe('hashed-password');
      expect(mockArgon2.hash).toHaveBeenCalledWith('Secret123');
    });

    it('throws when hashing fails', async () => {
      const error = new Error('hash failed');
      mockArgon2.hash.mockRejectedValue(error);

      await expect(hashpassword('Secret123')).rejects.toThrow('hash failed');
    });
  });

  describe('verifyHashPassword', () => {
    it('returns true when the password matches', async () => {
      mockArgon2.verify.mockResolvedValue(true);

      await expect(
        verifyHashPassword('hashed-password', 'Secret123'),
      ).resolves.toBe(true);
    });

    it('returns false when the password does not match', async () => {
      mockArgon2.verify.mockResolvedValue(false);

      await expect(
        verifyHashPassword('hashed-password', 'Wrong123'),
      ).resolves.toBe(false);
    });

    it('throws when verification fails', async () => {
      const error = new Error('verify failed');
      mockArgon2.verify.mockRejectedValue(error);

      await expect(
        verifyHashPassword('hashed-password', 'Secret123'),
      ).rejects.toThrow('verify failed');
    });
  });
});
