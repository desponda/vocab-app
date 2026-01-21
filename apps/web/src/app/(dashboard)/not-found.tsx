import { Error404 } from '@/components/error/http-errors';

export default function DashboardNotFound() {
  return <Error404 preserveLayout={true} />;
}
