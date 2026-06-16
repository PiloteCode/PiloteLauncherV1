'use client';

import { useParams } from 'next/navigation';
import { InstanceEditor } from '@/components/admin/instance-editor';

export default function EditInstancePage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!id) return null;

  return <InstanceEditor instanceId={id} />;
}
