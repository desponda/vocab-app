import { Error404 } from '@/components/error/http-errors';

export default function StudentDashboardNotFound() {
  return <Error404 preserveLayout={true} />;
}
