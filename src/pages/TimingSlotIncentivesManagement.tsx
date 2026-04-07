// C:\goindia-admin-1\src\pages\TimingSlotIncentivesManagement.tsx
/**
 * Admin panel for managing time-based driver incentives
 * Allows setting different reward tiers for different time blocks
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import axios from 'axios';

const API_BASE = 'https://ghumobackend.onrender.com';

interface MilestoneTier {
  ridesTarget: number;
  reward: number;
}

interface TimingSlot {
  timeLabel: string;
  startHour: number;
  endHour: number;
  milestones: MilestoneTier[];
}

interface TimingSlotIncentive {
  _id?: string;
  date: string;
  timingSlots: TimingSlot[];
  isActive: boolean;
}

const TimingSlotIncentivesManagement = () => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [incentive, setIncentive] = useState<TimingSlotIncentive | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  function getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  const getAuthToken = (): string => {
    return localStorage.getItem('adminToken') || '';
  };

  // Fetch incentives for selected date
  const fetchIncentive = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();

      const response = await axios.get(
        `${API_BASE}/api/admin/incentives/timing/${selectedDate}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
          },
        }
      );

      setIncentive(response.data.data);
    } catch (error) {
      console.error('Error fetching incentive:', error);
      showMessage(
        'error',
        'Failed to fetch incentive data'
      );
    } finally {
      setLoading(false);
    }
  };

  // Save incentives
  const saveIncentive = async () => {
    if (!incentive) return;

    try {
      setSaving(true);
      const token = getAuthToken();

      await axios.post(
        `${API_BASE}/api/admin/incentives/timing`,
        {
          date: selectedDate,
          timingSlots: incentive.timingSlots,
          isActive: incentive.isActive,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
          },
        }
      );

      showMessage('success', 'Incentive saved successfully!');
      fetchIncentive();
    } catch (error) {
      console.error('Error saving incentive:', error);
      showMessage('error', 'Failed to save incentive');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Update milestone tier
  const updateMilestone = (
    slotIndex: number,
    milestoneIndex: number,
    field: 'ridesTarget' | 'reward',
    value: number
  ) => {
    if (!incentive) return;

    const updated = { ...incentive };
    updated.timingSlots[slotIndex].milestones[milestoneIndex][field] = value;
    setIncentive(updated);
  };

  // Add milestone tier
  const addMilestone = (slotIndex: number) => {
    if (!incentive) return;

    const updated = { ...incentive };
    updated.timingSlots[slotIndex].milestones.push({
      ridesTarget: 0,
      reward: 0,
    });
    setIncentive(updated);
  };

  // Remove milestone tier
  const removeMilestone = (slotIndex: number, milestoneIndex: number) => {
    if (!incentive) return;

    const updated = { ...incentive };
    updated.timingSlots[slotIndex].milestones.splice(milestoneIndex, 1);
    setIncentive(updated);
  };

  // Update timing slot
  const updateTimingSlot = (
    slotIndex: number,
    field: string,
    value: any
  ) => {
    if (!incentive) return;

    const updated = { ...incentive };
    (updated.timingSlots[slotIndex] as any)[field] = value;
    setIncentive(updated);
  };

  useEffect(() => {
    fetchIncentive();
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Timing Slot Incentives
          </h1>
          <p className="text-gray-600">
            Manage driver incentives by time blocks
          </p>
        </div>

        {/* Date Picker */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="inline mr-2 w-4 h-4" />
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`rounded-lg p-4 mb-6 ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Loading incentive data...</p>
          </div>
        ) : incentive ? (
          <>
            {/* Time Slots */}
            <div className="space-y-6 mb-8">
              {incentive.timingSlots.map((slot, slotIndex) => (
                <div key={slotIndex} className="bg-white rounded-lg shadow p-6">
                  {/* Slot Header */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Time Label
                      </label>
                      <input
                        type="text"
                        value={slot.timeLabel}
                        onChange={(e) =>
                          updateTimingSlot(slotIndex, 'timeLabel', e.target.value)
                        }
                        placeholder="e.g., 06:00 AM - 11:59 AM"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Hour (0-23)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={slot.startHour}
                        onChange={(e) =>
                          updateTimingSlot(slotIndex, 'startHour', parseInt(e.target.value))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Hour (0-23)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={slot.endHour}
                        onChange={(e) =>
                          updateTimingSlot(slotIndex, 'endHour', parseInt(e.target.value))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Milestones */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Milestone Tiers
                      </h3>
                      <button
                        onClick={() => addMilestone(slotIndex)}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        <Plus className="w-4 h-4" />
                        Add Tier
                      </button>
                    </div>

                    <div className="space-y-3">
                      {slot.milestones.map((milestone, milestoneIndex) => (
                        <div
                          key={milestoneIndex}
                          className="flex gap-4 items-end bg-gray-50 p-4 rounded-lg"
                        >
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Rides Target
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={milestone.ridesTarget}
                              onChange={(e) =>
                                updateMilestone(
                                  slotIndex,
                                  milestoneIndex,
                                  'ridesTarget',
                                  parseInt(e.target.value)
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Reward (₹)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={milestone.reward}
                              onChange={(e) =>
                                updateMilestone(
                                  slotIndex,
                                  milestoneIndex,
                                  'reward',
                                  parseInt(e.target.value)
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <button
                            onClick={() => removeMilestone(slotIndex, milestoneIndex)}
                            className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Active Status */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={incentive.isActive}
                  onChange={(e) =>
                    setIncentive({ ...incentive, isActive: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">
                  Active / Visible to Drivers
                </span>
              </label>
            </div>

            {/* Save Button */}
            <div className="flex gap-4">
              <button
                onClick={saveIncentive}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Incentives'}
              </button>
              <button
                onClick={() => fetchIncentive()}
                disabled={loading}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600">Failed to load incentive data</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimingSlotIncentivesManagement;
