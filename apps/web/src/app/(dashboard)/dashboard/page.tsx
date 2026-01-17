'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to your vocabulary learning hub
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
            <CardDescription>
              Manage your students and their progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/students">
              <Button className="w-full">Manage Students</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vocabulary Lists</CardTitle>
            <CardDescription>
              Upload and manage vocabulary sheets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Practice Tests</CardTitle>
            <CardDescription>
              Generate and take vocabulary tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
