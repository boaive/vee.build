import { Link } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <>
      <PageHeader eyebrow="404" title="That page does not exist" description="The address may be wrong, or the record was deleted." />
      <Button asChild>
        <Link to="/">Back to Overview</Link>
      </Button>
    </>
  );
}
