'use client';

import Link from 'next/link';
import { Header, PageContainer } from '@/components/global';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import RecipeTable from './components/RecipeTable';

export default function RecipePage() {
  return (
    <PageContainer>
      <Header
        title="Recipes"
        description="Manage production recipes and their components"
        icon="📝"
      />

      <div className="mt-8 flex justify-end gap-2">
        <Link href="/recipes/recycle-bin">
          <Button variant="outline" className="flex items-center gap-2">
            <Trash2 size={16} />
            Recycle Bin
          </Button>
        </Link>
        <Link href="/recipes/add">
          <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus size={16} />
            Add Recipe
          </Button>
        </Link>
      </div>

      <div className="mt-8">
        <RecipeTable />
      </div>
    </PageContainer>
  );
}
