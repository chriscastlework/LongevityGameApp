"use client";

import React, { useState } from "react";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Settings, Plus, Edit, Trash2, Filter, RefreshCw } from "lucide-react";
import { useAuthContext } from "@/components/providers/auth-provider";
import {
  useScoringThresholds,
  useCreateScoringThreshold,
  useUpdateScoringThreshold,
  useDeleteScoringThreshold
} from "@/lib/hooks/useScoringThresholds";
import { useRouter } from "next/navigation";
import type { ScoringThreshold, StationType, AgeGroup, Gender, MetricName } from "@/lib/types/database";

const STATION_TYPES: StationType[] = ["balance", "breath", "grip"];
const GENDERS: Gender[] = ["male", "female"];
const AGE_GROUPS: AgeGroup[] = ["18-25", "26-35", "36-45", "46-55", "56-65", "65+"];

const METRIC_NAMES: Record<StationType, MetricName[]> = {
  balance: ["balance_seconds"],
  breath: ["balloon_diameter_cm"],
  grip: ["grip_seconds"]
};

interface ThresholdFormData {
  station_type: StationType;
  metric_name: MetricName;
  gender: Gender;
  age_group: AgeGroup;
  average_score_min: number;
  average_score_max: number;
  description: string;
  is_active: boolean;
}

export default function AdminScoringThresholdsPage() {
  const router = useRouter();
  const { user, profile } = useAuthContext();

  // Filters
  const [filters, setFilters] = useState<{
    station_type?: StationType;
    gender?: Gender;
    age_group?: AgeGroup;
  }>({});

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<ScoringThreshold | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ThresholdFormData>({
    station_type: "balance",
    metric_name: "balance_seconds",
    gender: "male",
    age_group: "18-25",
    average_score_min: 0,
    average_score_max: 0,
    description: "",
    is_active: true
  });

  // Hooks
  const { data: thresholds, isLoading, error, refetch } = useScoringThresholds(filters);
  const createThreshold = useCreateScoringThreshold();
  const updateThreshold = useUpdateScoringThreshold();
  const deleteThreshold = useDeleteScoringThreshold();

  // Check admin access
  React.useEffect(() => {
    if (profile && profile.role !== 'admin') {
      router.push('/participate');
    }
  }, [profile, router]);

  if (!profile || profile.role !== 'admin') {
    return (
      <AuthenticatedLayout title="Access Denied" subtitle="Admin access required">
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>
              You don't have permission to access this page. Admin role required.
            </AlertDescription>
          </Alert>
        </div>
      </AuthenticatedLayout>
    );
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createThreshold.mutateAsync(formData);
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating threshold:', error);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingThreshold) return;

    try {
      await updateThreshold.mutateAsync({
        ...formData,
        id: editingThreshold.id
      });
      setIsEditModalOpen(false);
      setEditingThreshold(null);
      resetForm();
    } catch (error) {
      console.error('Error updating threshold:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scoring threshold?')) return;

    try {
      await deleteThreshold.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting threshold:', error);
    }
  };

  const handleEdit = (threshold: ScoringThreshold) => {
    setEditingThreshold(threshold);
    setFormData({
      station_type: threshold.station_type as StationType,
      metric_name: threshold.metric_name as MetricName,
      gender: threshold.gender as Gender,
      age_group: threshold.age_group as AgeGroup,
      average_score_min: threshold.average_score_min || 0,
      average_score_max: threshold.average_score_max || 0,
      description: threshold.description || "",
      is_active: threshold.is_active
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      station_type: "balance",
      metric_name: "balance_seconds",
      gender: "male",
      age_group: "18-25",
      average_score_min: 0,
      average_score_max: 0,
      description: "",
      is_active: true
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  const getMetricOptions = (stationType: StationType) => {
    return METRIC_NAMES[stationType] || [];
  };

  const formatMetricName = (metric: string) => {
    return metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <AuthenticatedLayout
      title="Scoring Thresholds"
      subtitle="Manage fitness scoring criteria by demographics"
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Scoring Thresholds
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Configure fitness scoring criteria for different demographics
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Threshold
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Scoring Threshold</DialogTitle>
                  <DialogDescription>
                    Add a new scoring threshold for a specific demographic and station.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateSubmit}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="station_type">Station Type</Label>
                        <Select
                          value={formData.station_type}
                          onValueChange={(value: StationType) => {
                            setFormData(prev => ({
                              ...prev,
                              station_type: value,
                              metric_name: getMetricOptions(value)[0]
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATION_TYPES.map(type => (
                              <SelectItem key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="metric_name">Metric</Label>
                        <Select
                          value={formData.metric_name}
                          onValueChange={(value: MetricName) => {
                            setFormData(prev => ({ ...prev, metric_name: value }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getMetricOptions(formData.station_type).map(metric => (
                              <SelectItem key={metric} value={metric}>
                                {formatMetricName(metric)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="gender">Gender</Label>
                        <Select
                          value={formData.gender}
                          onValueChange={(value: Gender) => {
                            setFormData(prev => ({ ...prev, gender: value }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GENDERS.map(gender => (
                              <SelectItem key={gender} value={gender}>
                                {gender.charAt(0).toUpperCase() + gender.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="age_group">Age Group</Label>
                        <Select
                          value={formData.age_group}
                          onValueChange={(value: AgeGroup) => {
                            setFormData(prev => ({ ...prev, age_group: value }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AGE_GROUPS.map(group => (
                              <SelectItem key={group} value={group}>
                                {group}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="average_score_min">Average Score Min</Label>
                        <Input
                          id="average_score_min"
                          type="number"
                          step="0.1"
                          value={formData.average_score_min}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            average_score_min: parseFloat(e.target.value) || 0
                          }))}
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Values below this get Score 1
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="average_score_max">Average Score Max</Label>
                        <Input
                          id="average_score_max"
                          type="number"
                          step="0.1"
                          value={formData.average_score_max}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            average_score_max: parseFloat(e.target.value) || 0
                          }))}
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Values above this get Score 3
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          description: e.target.value
                        }))}
                        placeholder="Optional description"
                      />
                    </div>
                  </div>

                  <DialogFooter className="mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createThreshold.isPending}
                    >
                      {createThreshold.isPending ? 'Creating...' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div>
                <Label>Station Type</Label>
                <Select
                  value={filters.station_type || "all"}
                  onValueChange={(value) => setFilters(prev => ({
                    ...prev,
                    station_type: value === "all" ? undefined : (value as StationType)
                  }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All stations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stations</SelectItem>
                    {STATION_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Gender</Label>
                <Select
                  value={filters.gender || "all"}
                  onValueChange={(value) => setFilters(prev => ({
                    ...prev,
                    gender: value === "all" ? undefined : (value as Gender)
                  }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All genders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All genders</SelectItem>
                    {GENDERS.map(gender => (
                      <SelectItem key={gender} value={gender}>
                        {gender.charAt(0).toUpperCase() + gender.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Age Group</Label>
                <Select
                  value={filters.age_group || "all"}
                  onValueChange={(value) => setFilters(prev => ({
                    ...prev,
                    age_group: value === "all" ? undefined : (value as AgeGroup)
                  }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All ages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ages</SelectItem>
                    {AGE_GROUPS.map(group => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>Scoring Thresholds</CardTitle>
            <CardDescription>
              {thresholds?.length || 0} threshold{thresholds?.length !== 1 ? 's' : ''} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  Failed to load scoring thresholds. Please try refreshing the page.
                </AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">Loading scoring thresholds...</div>
              </div>
            ) : thresholds && thresholds.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Station</TableHead>
                      <TableHead>Metric</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Age Group</TableHead>
                      <TableHead>Average Min</TableHead>
                      <TableHead>Average Max</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {thresholds.map((threshold) => (
                      <TableRow key={threshold.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {threshold.station_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatMetricName(threshold.metric_name)}
                        </TableCell>
                        <TableCell>
                          {threshold.gender}
                        </TableCell>
                        <TableCell>
                          {threshold.age_group}
                        </TableCell>
                        <TableCell>
                          {threshold.average_score_min}
                        </TableCell>
                        <TableCell>
                          {threshold.average_score_max}
                        </TableCell>
                        <TableCell>
                          <Badge variant={threshold.is_active ? "default" : "secondary"}>
                            {threshold.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(threshold)}
                              disabled={updateThreshold.isPending}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(threshold.id)}
                              disabled={deleteThreshold.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No scoring thresholds found. Create one to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Scoring Threshold</DialogTitle>
              <DialogDescription>
                Update the scoring threshold values.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Station Type</Label>
                    <div className="p-2 bg-muted rounded text-sm">
                      {formData.station_type}
                    </div>
                  </div>
                  <div>
                    <Label>Metric</Label>
                    <div className="p-2 bg-muted rounded text-sm">
                      {formatMetricName(formData.metric_name)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Gender</Label>
                    <div className="p-2 bg-muted rounded text-sm">
                      {formData.gender}
                    </div>
                  </div>
                  <div>
                    <Label>Age Group</Label>
                    <div className="p-2 bg-muted rounded text-sm">
                      {formData.age_group}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_average_score_min">Average Score Min</Label>
                    <Input
                      id="edit_average_score_min"
                      type="number"
                      step="0.1"
                      value={formData.average_score_min}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        average_score_min: parseFloat(e.target.value) || 0
                      }))}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Values below this get Score 1
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="edit_average_score_max">Average Score Max</Label>
                    <Input
                      id="edit_average_score_max"
                      type="number"
                      step="0.1"
                      value={formData.average_score_max}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        average_score_max: parseFloat(e.target.value) || 0
                      }))}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Values above this get Score 3
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit_description">Description</Label>
                  <Input
                    id="edit_description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      description: e.target.value
                    }))}
                    placeholder="Optional description"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit_is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      is_active: e.target.checked
                    }))}
                  />
                  <Label htmlFor="edit_is_active">Active</Label>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingThreshold(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateThreshold.isPending}
                >
                  {updateThreshold.isPending ? 'Updating...' : 'Update'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
}