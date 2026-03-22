import { CheckCircle, CalendarDays } from 'lucide-react';

const EmptyFeedState = () => {
    return (
        <div className="flex flex-col items-center justify-center w-full py-16 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-green-100 rounded-full blur-xl opacity-60"></div>
                <div className="relative bg-white p-4 rounded-full shadow-sm border border-gray-100">
                    <CheckCircle className="w-12 h-12 text-green-500" strokeWidth={1.5} />
                </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-2 text-center">
                All caught up for today!
            </h3>

            <p className="text-gray-500 text-center max-w-sm mb-6 leading-relaxed">
                The scheduled visits for all schools have concluded. Take a breather, or check the calendar to see what is coming up tomorrow.
            </p>

            <button className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm">
                <CalendarDays className="w-4 h-4" />
                View Upcoming Schedule
            </button>
        </div>
    );
};

export default EmptyFeedState;