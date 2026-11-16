'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [suggestions, setSuggestions] = useState([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [groups, setGroups] = useState([]);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [suggestionsRes, friendsRes, groupsRes, eventsRes] = await Promise.all([
        api.get('/matching/suggestions?limit=5'),
        api.get('/connections'),
        api.get('/groups/user/my-groups'),
        api.get('/events?upcoming=true&limit=5'),
      ]);

      setSuggestions(suggestionsRes.data.suggestions);
      setFriends(friendsRes.data.connections);
      setGroups(groupsRes.data.groups);
      setEvents(eventsRes.data.events);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">CampusConnect</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.name}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Suggested Connections */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Suggested Connections
                </h3>
                {suggestions.length === 0 ? (
                  <p className="text-gray-500 text-sm">No suggestions available</p>
                ) : (
                  <div className="space-y-3">
                    {suggestions.map((suggestion: any) => (
                      <div key={suggestion.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{suggestion.name}</p>
                          <p className="text-sm text-gray-500">{suggestion.department}</p>
                          <p className="text-xs text-primary">
                            {suggestion.matchScore}% match
                          </p>
                        </div>
                        <button className="text-sm text-primary hover:text-primary/80">
                          Connect
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* My Study Groups */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">My Study Groups</h3>
                {groups.length === 0 ? (
                  <p className="text-gray-500 text-sm">You haven't joined any groups yet</p>
                ) : (
                  <div className="space-y-3">
                    {groups.map((group: any) => (
                      <div key={group.id} className="border-b pb-2">
                        <p className="font-medium">{group.name}</p>
                        <p className="text-sm text-gray-500">{group.course_name}</p>
                        <p className="text-xs text-gray-400">
                          {group.member_count} members
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Upcoming Events</h3>
                {events.length === 0 ? (
                  <p className="text-gray-500 text-sm">No upcoming events</p>
                ) : (
                  <div className="space-y-3">
                    {events.map((event: any) => (
                      <div key={event.id} className="border-b pb-2">
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-gray-500">{event.location}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(event.event_date).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Friends */}
          <section className="mt-6 bg-white overflow-hidden shadow rounded-lg" aria-labelledby="friends-heading">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 id="friends-heading" className="text-lg font-medium text-gray-900">My Friends</h2>
                  <p className="text-sm text-gray-500">Students you have connected with</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-primary" aria-label={`${friends.length} friends`}>
                  {friends.length}
                </span>
              </div>
              {friends.length === 0 ? (
                <p className="text-sm text-gray-500">You don’t have any friends yet. Connect with a suggested student to get started.</p>
              ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Friends list">
                  {friends.map((friend) => (
                    <li key={friend.id} className="flex items-center gap-3 rounded-md border border-gray-100 p-3">
                      {friend.profile_picture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={friend.profile_picture} alt="" className="h-11 w-11 rounded-full object-cover" />
                      ) : (
                        <div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-primary">
                          {(friend.name || '?').trim().charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{friend.name}</p>
                        <p className="truncate text-sm text-gray-500">{friend.department || friend.university || 'CampusConnect student'}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Quick Actions */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="bg-white p-4 rounded-lg shadow hover:shadow-md transition">
              <p className="font-medium">Find Study Partners</p>
            </button>
            <button className="bg-white p-4 rounded-lg shadow hover:shadow-md transition">
              <p className="font-medium">Browse Events</p>
            </button>
            <button className="bg-white p-4 rounded-lg shadow hover:shadow-md transition">
              <p className="font-medium">Messages</p>
            </button>
            <button className="bg-white p-4 rounded-lg shadow hover:shadow-md transition">
              <p className="font-medium">My Profile</p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
