import { useEffect, useState } from 'react';
import EmptyFeedState from './EmptyFeed';

const DailyFeed = () => {
    const [feedItems, setFeedItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active');

    useEffect(() => {
        const fetchFeed = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/admin/daily-feed?status=${filter}`);
                const result = await response.json();
                if (result.success) {
                    setFeedItems(result.data);
                }
            } catch (error) {
                console.error("Failed to fetch feed", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFeed();
    }, [filter]);

    return (
        <div className="max-w-3xl mx-auto p-4">
            {/* Header & Tabs */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Live Daily Feed</h2>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setFilter('active')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setFilter('completed')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'completed' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Completed
                    </button>
                </div>
            </div>

            {/* Feed Content */}
            {loading ? (
                <div className="p-8 text-center text-gray-500 animate-pulse">Loading live data...</div>
            ) : feedItems.length === 0 ? (
                <EmptyFeedState filterType={filter} />
            ) : (
                <div className="flex flex-col gap-4">
                    {feedItems.map((record) => (
                        <div
                            key={record._id}
                            className={`p-4 border rounded-lg shadow-sm transition-colors ${filter === 'completed' ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-100'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    {/* Using your exact Schema fields here */}
                                    <h4 className="font-semibold text-gray-800">{record.school?.schoolName || 'Unknown School'}</h4>
                                    <p className="text-sm text-gray-500">{record.school?.address || 'Location tracked'}</p>
                                </div>
                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${filter === 'completed' ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700 animate-pulse'
                                    }`}>
                                    {filter === 'completed' ? 'Shift Ended' : 'Currently On-Site'}
                                </span>
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium text-gray-800">Teacher:</span> {record.teacher?.name || 'Unknown'}
                                </p>

                                <p className="text-sm text-gray-500">
                                    {filter === 'completed' ? (
                                        <>Checked out at: <span className="font-medium text-gray-700">{new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></>
                                    ) : (
                                        <>Checked in at: <span className="font-medium text-blue-700">{new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></>
                                    )}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DailyFeed;