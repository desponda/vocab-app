import { Error404 } from '@/components/error/http-errors';

export default function NotFound() {
  return <Error404 preserveLayout={false} />;
}
