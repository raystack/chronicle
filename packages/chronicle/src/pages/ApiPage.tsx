import type { OpenAPIV3 } from 'openapi-types';
import { Navigate } from 'react-router';
import { ApiOverview } from '@/components/api';
import { findApiOperation, getFirstApiUrl } from '@/lib/api-routes';
import { Head } from '@/lib/head';
import { usePageContext } from '@/lib/page-context';

interface ApiPageProps {
  slug: string[];
}

export function ApiPage({ slug }: ApiPageProps) {
  const { config, apiSpecs } = usePageContext();

  if (slug.length === 0) {
    const firstUrl = getFirstApiUrl(apiSpecs);
    if (firstUrl) return <Navigate to={firstUrl} replace />;
    return null;
  }

  const match = findApiOperation(apiSpecs, slug);
  if (!match) return null;

  const operation = match.operation as OpenAPIV3.OperationObject;
  const title =
    operation.summary ?? `${match.method.toUpperCase()} ${match.path}`;

  return (
    <>
      <Head title={title} description={operation.description} config={config} />
      <ApiOverview
        method={match.method}
        path={match.path}
        operation={match.operation}
        serverUrl={match.spec.server.url}
        specName={match.spec.name}
        auth={match.spec.auth}
      />
    </>
  );
}

