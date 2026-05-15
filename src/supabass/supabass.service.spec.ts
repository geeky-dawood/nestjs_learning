import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabass.service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;

describe('SupabaseService', () => {
  const mockConfig = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue({ storage: {} } as any);
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'SUPABASE_URL') return 'https://example.supabase.co';
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-role-key';
      return undefined;
    });
  });

  it('should create a Supabase client from config values', () => {
    const service = new SupabaseService(mockConfig as unknown as ConfigService);

    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-role-key',
    );
    expect(service.client).toEqual({ storage: {} });
  });

  it('should throw a clear error when Supabase URL is missing', () => {
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-role-key';
      return undefined;
    });

    expect(
      () => new SupabaseService(mockConfig as unknown as ConfigService),
    ).toThrow(InternalServerErrorException);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('should throw a clear error when Supabase key is missing', () => {
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'SUPABASE_URL') return 'https://example.supabase.co';
      return undefined;
    });

    expect(
      () => new SupabaseService(mockConfig as unknown as ConfigService),
    ).toThrow(
      'Supabase configuration missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
