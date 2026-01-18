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
            <CardTitle>Classrooms</CardTitle>
            <CardDescription>
              Create classes and assign tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/classrooms">
              <Button className="w-full">Manage Classrooms</Button>
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
            <Link href="/vocabulary">
              <Button className="w-full">Manage Vocabulary</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assigned Tests</CardTitle>
            <CardDescription>
              View and take your assigned tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/tests">
              <Button className="w-full">View Tests</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
