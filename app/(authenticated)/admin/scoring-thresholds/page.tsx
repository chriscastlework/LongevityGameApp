"use client";

import React, { useState } from "react";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Settings, Plus, Edit, Trash2, Filter, RefreshCw } from "lucide-react";
import { useAuthContext } from "@/components/providers/auth-provider";
import {
  useScoringThresholds,
  useCreateScoringThreshold,
  useUpdateScoringThreshold,
  useDeleteScoringThreshold,
} from "@/lib/hooks/useScoringThresholds";
import { useRouter } from "next/navigation";
import type {
  ScoringThreshold,
  StationType,
  Gender,
} from "@/lib/types/database";

const STATION_TYPES: StationType[] = ["balance", "breath", "grip"];
const GENDERS: Gender[] = ["male", "female"];

interface ThresholdFormData {
  station_type: StationType;
  gender: Gender;
  min_age: number;
  max_age: number | null;
  score: number;
  min_value: number | null;
  max_value: number | null;
}

export default function AdminScoringThresholdsPage() {
  const router = useRouter();
  const { user, profile } = useAuthContext();

  // Filters
  const [filters, setFilters] = useState<{
    station_type?: StationType;
    gender?: Gender;
    age?: number;
  }>({});

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingThreshold, setEditingThreshold] =
    useState<ScoringThreshold | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ThresholdFormData>({
    station_type: "balance",
    gender: "male",
    min_age: 18,
    max_age: 39,
    score: 1,
    min_value: null,
    max_value: null,
  });

  // Hooks
  const {
    data: thresholds,
    isLoading,
    error,
    refetch,
  } = useScoringThresholds(filters);
  const createThreshold = useCreateScoringThreshold();
  const updateThreshold = useUpdateScoringThreshold();
  const deleteThreshold = useDeleteScoringThreshold();

  // Check admin access
  React.useEffect(() => {
    if (profile && profile.role !== "admin") {
      router.push("/participate");
    }
  }, [profile, router]);

  if (!profile || profile.role !== "admin") {
    return (
      <AuthenticatedLayout
        title="Access Denied"
        subtitle="Admin access required"
      >
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>
              You don't have permission to access this page. Admin role
              required.
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
      console.error("Error creating threshold:", error);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingThreshold) return;

    try {
      await updateThreshold.mutateAsync({
        ...formData,
        id: editingThreshold.id,
      });
      setIsEditModalOpen(false);
      setEditingThreshold(null);
      resetForm();
    } catch (error) {
      console.error("Error updating threshold:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scoring threshold?"))
      return;

    try {
      await deleteThreshold.mutateAsync(id);
    } catch (error) {
      console.error("Error deleting threshold:", error);
    }
  };

  const handleEdit = (threshold: ScoringThreshold) => {
    setEditingThreshold(threshold);
    setFormData({
      station_type: threshold.station_type as StationType,
      gender: threshold.gender as Gender,
      min_age: threshold.min_age,
      max_age: threshold.max_age,
      score: threshold.score,
      min_value: threshold.min_value,
      max_value: threshold.max_value,
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      station_type: "balance",
      gender: "male",
      min_age: 18,
      max_age: 39,
      score: 1,
      min_value: null,
      max_value: null,
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  const formatStationType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getScoreLabel = (score: number) => {
    switch (score) {
      case 3:
        return "Excellent";
      case 2:
        return "Average";
      case 1:
        return "Low";
      default:
        return `Score ${score}`;
    }
  };

  const getAgeRangeDisplay = (minAge: number, maxAge: number | null) => {
    if (maxAge === null) {
      return `${minAge}+`;
    }
    return `${minAge}-${maxAge}`;
  };

  const getValueRangeDisplay = (
    minValue: number | null,
    maxValue: number | null
  ) => {
    if (minValue === null && maxValue === null) {
      return "Any";
    }
    if (minValue === null) {
      return `≤ ${maxValue}`;
    }
    if (maxValue === null) {
      return `≥ ${minValue}`;
    }
    return `${minValue} - ${maxValue}`;
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
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>

            <Dialog
              open={isCreateModalOpen}
              onOpenChange={setIsCreateModalOpen}
            >
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
                    Add a new scoring threshold for a specific demographic and
                    station.
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
                            setFormData((prev) => ({
                              ...prev,
                              station_type: value,
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATION_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {formatStationType(type)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="gender">Gender</Label>
                        <Select
                          value={formData.gender}
                          onValueChange={(value: Gender) => {
                            setFormData((prev) => ({ ...prev, gender: value }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GENDERS.map((gender) => (
                              <SelectItem key={gender} value={gender}>
                                {gender.charAt(0).toUpperCase() +
                                  gender.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="min_age">Min Age</Label>
                        <Input
                          id="min_age"
                          type="number"
                          min="0"
                          value={formData.min_age}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              min_age: parseInt(e.target.value) || 0,
                            }))
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="max_age">Max Age</Label>
                        <Input
                          id="max_age"
                          type="number"
                          min="0"
                          value={formData.max_age || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              max_age: e.target.value
                                ? parseInt(e.target.value)
                                : null,
                            }))
                          }
                          placeholder="No limit"
                        />
                      </div>

                      <div>
                        <Label htmlFor="score">Score</Label>
                        <Select
                          value={formData.score.toString()}
                          onValueChange={(value) => {
                            setFormData((prev) => ({
                              ...prev,
                              score: parseInt(value),
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 - Low</SelectItem>
                            <SelectItem value="2">2 - Average</SelectItem>
                            <SelectItem value="3">3 - Excellent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="min_value">Min Value</Label>
                        <Input
                          id="min_value"
                          type="number"
                          step="0.1"
                          value={formData.min_value || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              min_value: e.target.value
                                ? parseFloat(e.target.value)
                                : null,
                            }))
                          }
                          placeholder="No minimum"
                        />
                      </div>

                      <div>
                        <Label htmlFor="max_value">Max Value</Label>
                        <Input
                          id="max_value"
                          type="number"
                          step="0.1"
                          value={formData.max_value || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              max_value: e.target.value
                                ? parseFloat(e.target.value)
                                : null,
                            }))
                          }
                          placeholder="No maximum"
                        />
                      </div>
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
                    <Button type="submit" disabled={createThreshold.isPending}>
                      {createThreshold.isPending ? "Creating..." : "Create"}
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
            <CardDescription>
              Filter scoring thresholds by station type, gender, and age. Enter
              an age to see all thresholds that apply to someone of that age.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end flex-wrap">
              <div>
                <Label>Station Type</Label>
                <Select
                  value={filters.station_type || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      station_type:
                        value === "all" ? undefined : (value as StationType),
                    }))
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All stations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stations</SelectItem>
                    {STATION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {formatStationType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Gender</Label>
                <Select
                  value={filters.gender || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      gender: value === "all" ? undefined : (value as Gender),
                    }))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All genders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All genders</SelectItem>
                    {GENDERS.map((gender) => (
                      <SelectItem key={gender} value={gender}>
                        {gender.charAt(0).toUpperCase() + gender.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Age</Label>
                <Input
                  type="number"
                  placeholder="Enter age"
                  className="w-32"
                  min="0"
                  value={filters.age || ""}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      age: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    }))
                  }
                  title="Show all thresholds that apply to this age"
                />
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
              {thresholds?.length || 0} threshold
              {thresholds?.length !== 1 ? "s" : ""} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  Failed to load scoring thresholds. Please try refreshing the
                  page.
                </AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">
                  Loading scoring thresholds...
                </div>
              </div>
            ) : thresholds && thresholds.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Station</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Age Range</TableHead>
                      <TableHead>Value Range</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {thresholds.map((threshold) => (
                      <TableRow key={threshold.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {formatStationType(threshold.station_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {threshold.gender.charAt(0).toUpperCase() +
                            threshold.gender.slice(1)}
                        </TableCell>
                        <TableCell>
                          {getAgeRangeDisplay(
                            threshold.min_age,
                            threshold.max_age
                          )}
                        </TableCell>
                        <TableCell>
                          {getValueRangeDisplay(
                            threshold.min_value,
                            threshold.max_value
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              threshold.score === 3
                                ? "default"
                                : threshold.score === 2
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {getScoreLabel(threshold.score)}
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
                      {formatStationType(formData.station_type)}
                    </div>
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <div className="p-2 bg-muted rounded text-sm">
                      {formData.gender.charAt(0).toUpperCase() +
                        formData.gender.slice(1)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit_min_age">Min Age</Label>
                    <Input
                      id="edit_min_age"
                      type="number"
                      min="0"
                      value={formData.min_age}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          min_age: parseInt(e.target.value) || 0,
                        }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit_max_age">Max Age</Label>
                    <Input
                      id="edit_max_age"
                      type="number"
                      min="0"
                      value={formData.max_age || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          max_age: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        }))
                      }
                      placeholder="No limit"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit_score">Score</Label>
                    <Select
                      value={formData.score.toString()}
                      onValueChange={(value) => {
                        setFormData((prev) => ({
                          ...prev,
                          score: parseInt(value),
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Low</SelectItem>
                        <SelectItem value="2">2 - Average</SelectItem>
                        <SelectItem value="3">3 - Excellent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_min_value">Min Value</Label>
                    <Input
                      id="edit_min_value"
                      type="number"
                      step="0.1"
                      value={formData.min_value || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          min_value: e.target.value
                            ? parseFloat(e.target.value)
                            : null,
                        }))
                      }
                      placeholder="No minimum"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit_max_value">Max Value</Label>
                    <Input
                      id="edit_max_value"
                      type="number"
                      step="0.1"
                      value={formData.max_value || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          max_value: e.target.value
                            ? parseFloat(e.target.value)
                            : null,
                        }))
                      }
                      placeholder="No maximum"
                    />
                  </div>
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
                <Button type="submit" disabled={updateThreshold.isPending}>
                  {updateThreshold.isPending ? "Updating..." : "Update"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
}
