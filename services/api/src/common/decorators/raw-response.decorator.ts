import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE_KEY = 'xiii:raw-response';
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);
