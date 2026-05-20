import { existsSync } from 'fs';
import { join } from 'path';

const RATER_PROTO_RELATIVE_PATH = join('libs', 'common', 'src', 'proto', 'rater.proto');
const RATER_DIST_PROTO_RELATIVE_PATH = join(
  'dist',
  'libs',
  'common',
  'proto',
  'rater.proto',
);

export function getRaterProtoPath(): string {
  const distPath = join(process.cwd(), RATER_DIST_PROTO_RELATIVE_PATH);
  if (existsSync(distPath)) {
    return distPath;
  }

  return join(process.cwd(), RATER_PROTO_RELATIVE_PATH);
}
