import React, { useState, useEffect } from 'react';

const ReviewManagementModal = ({ isOpen, onClose, contact, onReviewsUpdated }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    text: '',
    author: '',
    date_text: ''
  });

  // Clear message after 3 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Fetch reviews when modal opens
  useEffect(() => {
    if (isOpen && contact?.id) {
      fetchReviews();
    }
  }, [isOpen, contact?.id]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      
      console.log('📥 Fetching reviews from both sources...');
      
      // Fetch from both the recommendations table AND agent data with proper error handling
      const fetchWithErrorHandling = async (url) => {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            console.error(`❌ HTTP error ${response.status} for ${url}`);
            return { success: false, error: `HTTP ${response.status}` };
          }
          
          const text = await response.text();
          try {
            return JSON.parse(text);
          } catch (parseError) {
            console.error(`❌ JSON parse error for ${url}:`, parseError);
            console.error(`❌ Response text:`, text.substring(0, 200));
            return { success: false, error: 'Invalid JSON response' };
          }
        } catch (fetchError) {
          console.error(`❌ Fetch error for ${url}:`, fetchError);
          return { success: false, error: fetchError.message };
        }
      };
      
      const [recommendationsData, agentData] = await Promise.all([
        fetchWithErrorHandling(`/api/agents/${contact.id}/recommendations`),
        fetchWithErrorHandling(`/api/agents/${contact.id}`)
      ]);
      
      console.log('📥 Recommendations API response:', recommendationsData);
      console.log('📥 Agent API response:', {
        success: agentData.success,
        hasAgent: !!agentData.agent,
        hasReviews: !!(agentData.agent && agentData.agent.reviews)
      });
      
      let allReviews = [];
      
      // Add reviews from recommendations table (with UUID IDs)
      if (recommendationsData.success && recommendationsData.recommendations) {
        const tableReviews = recommendationsData.recommendations.map(rec => ({
          ...rec,
          type: 'recommendation',
          source: rec.source || 'recommendations_table',
          date_text: rec.date_text || rec.date || null,
          isFromTable: true // Flag to indicate this came from the table
        }));
        allReviews.push(...tableReviews);
        console.log('� Added', tableReviews.length, 'reviews from recommendations table');
      }
      
      // Add reviews from agent data structure (with integer IDs) 
      if (agentData.success && agentData.agent && agentData.agent.reviews) {
        const individualReviews = agentData.agent.reviews.individual || [];
        const agentRecommendations = agentData.agent.reviews.recommendations || [];
        
        const agentReviews = [
          ...individualReviews.map(review => ({ 
            ...review, 
            type: 'individual',
            source: review.source || 'agent_data',
            isFromTable: false // Flag to indicate this came from agent data
          })),
          ...agentRecommendations.map(review => ({ 
            ...review, 
            type: 'recommendation',
            source: review.source || 'agent_data', 
            isFromTable: false
          }))
        ];
        
        // Only add agent reviews that aren't already in the table (avoid duplicates)
        const uniqueAgentReviews = agentReviews.filter(agentReview => {
          return !allReviews.some(tableReview => 
            tableReview.text === agentReview.text && 
            tableReview.author === agentReview.author
          );
        });
        
        allReviews.push(...uniqueAgentReviews);
        console.log('📋 Added', uniqueAgentReviews.length, 'unique reviews from agent data');
      }
      
      console.log('🔗 Total reviews found:', allReviews.length);
      console.log('🔗 Review sources:', allReviews.map(r => `${r.isFromTable ? 'TABLE' : 'AGENT'}:${r.source}`));
      
      setReviews(allReviews);
      
      if (allReviews.length > 0) {
        showMessage('success', `Loaded ${allReviews.length} reviews/recommendations`);
      } else {
        showMessage('info', 'No reviews found for this contact');
      }
    } catch (error) {
      console.error('❌ Error fetching reviews:', error);
      setReviews([]);
      showMessage('error', 'Error loading reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.text.trim()) {
      showMessage('error', 'Review text is required');
      return;
    }
    
    if (formData.text.trim().length < 10) {
      showMessage('error', 'Review text must be at least 10 characters long');
      return;
    }
    
    try {
      console.log('➕ Adding new review via recommendations API...');
      
      // Add directly to the recommendations table using Chrome Extension API
  const response = await fetch(`/api/agents/${contact.id}/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: formData.text,
          author: formData.author || 'Anonymous',
          date_text: formData.date_text || new Date().toLocaleDateString(),
          source: 'manual'
        })
      });

      console.log('📤 Add response status:', response.status);
      const data = await response.json();
      console.log('📤 Add response data:', data);
      
      if (data.success) {
        console.log('✅ Review added successfully, refreshing...');
        await fetchReviews();
        setFormData({ text: '', author: '', date_text: '' });
        setShowAddForm(false);
        showMessage('success', 'Review added successfully');
        if (onReviewsUpdated) onReviewsUpdated();
      } else {
        console.error('❌ Failed to add review:', data.error);
        showMessage('error', data.error || 'Failed to add review');
      }
    } catch (error) {
      console.error('❌ Error adding review:', error);
      showMessage('error', 'Error adding review');
    }
  };

  const handleUpdate = async (reviewId, updatedData) => {
    if (!updatedData.text.trim()) {
      showMessage('error', 'Review text is required');
      return;
    }

    if (updatedData.text.trim().length < 10) {
      showMessage('error', 'Review text must be at least 10 characters long');
      return;
    }

    try {
      console.log(`✏️ Updating review ${reviewId}...`);
      
      // Find the review to determine if it's from table or agent data
      const review = reviews.find(r => r.id === reviewId);
      if (!review) {
        throw new Error('Review not found');
      }
      
      if (review.isFromTable) {
        // Update directly in the recommendations table using Chrome Extension API
  const response = await fetch(`/api/recommendations/${reviewId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: updatedData.text,
            author: updatedData.author || 'Anonymous',
            date_text: updatedData.date_text || new Date().toLocaleDateString()
          })
        });

        console.log('📤 Update response status:', response.status);
        const data = await response.json();
        console.log('📤 Update response data:', data);
        
        if (data.success) {
          console.log('✅ Review updated successfully, refreshing...');
          await fetchReviews();
          setEditingId(null);
          showMessage('success', 'Review updated successfully');
          if (onReviewsUpdated) onReviewsUpdated();
        } else {
          console.error('❌ Failed to update review:', data.error);
          showMessage('error', data.error || 'Failed to update review');
        }
      } else {
        // This is from agent data - we'll need to migrate it to the table first
        console.log('📝 Migrating agent data review to table...');
        showMessage('info', 'Migrating review to database...');
        
        // Add it to the recommendations table
  const addResponse = await fetch(`/api/agents/${contact.id}/recommendations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: updatedData.text,
            author: updatedData.author || review.author || 'Anonymous',
            date_text: updatedData.date_text || review.date_text || new Date().toLocaleDateString(),
            source: 'migrated_from_agent_data'
          })
        });

        const addData = await addResponse.json();
        if (addData.success) {
          console.log('✅ Review migrated and updated successfully');
          await fetchReviews();
          setEditingId(null);
          showMessage('success', 'Review updated and migrated to database');
          if (onReviewsUpdated) onReviewsUpdated();
        } else {
          console.error('❌ Failed to migrate review:', addData.error);
          showMessage('error', addData.error || 'Failed to update review');
        }
      }
    } catch (error) {
      console.error('❌ Error updating review:', error);
      showMessage('error', 'Error updating review');
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review? This action cannot be undone.')) return;
    
    try {
      console.log(`🗑️ Deleting review ${reviewId}...`);
      
      // Find the review to determine if it's from table or agent data
      const review = reviews.find(r => r.id === reviewId);
      if (!review) {
        throw new Error('Review not found');
      }
      
      if (review.isFromTable) {
        // Delete directly from the recommendations table using Chrome Extension API
  const response = await fetch(`/api/recommendations/${reviewId}`, {
          method: 'DELETE'
        });

        console.log('📤 Delete response status:', response.status);
        const data = await response.json();
        console.log('📤 Delete response data:', data);
        
        if (data.success) {
          console.log('✅ Review deleted successfully, refreshing...');
          await fetchReviews();
          showMessage('success', 'Review deleted successfully');
          if (onReviewsUpdated) onReviewsUpdated();
        } else {
          console.error('❌ Failed to delete review:', data.error);
          showMessage('error', data.error || 'Failed to delete review');
        }
      } else {
        // This is from agent data - just remove it from the UI since it's read-only
        console.log('⚠️ Cannot delete review from agent data structure');
        showMessage('error', 'Cannot delete reviews from legacy data. Please contact support to migrate this review.');
      }
    } catch (error) {
      console.error('❌ Error deleting review:', error);
      showMessage('error', 'Error deleting review');
    }
  };

  const EditableReview = ({ review }) => {
    const [editData, setEditData] = useState({
      text: review.text || '',
      author: review.author || '',
      date_text: review.date_text || review.date || ''
    });

    const handleSave = () => {
      handleUpdate(review.id, editData);
    };

    if (editingId === review.id) {
      return (
        <div className="border border-blue-600 rounded-lg p-4 mb-3 bg-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                review.type === 'individual' 
                  ? 'bg-green-900 text-green-300' 
                  : 'bg-purple-900 text-purple-300'
              }`}>
                {review.type === 'individual' ? '👤 Individual Review' : '⭐ Recommendation'}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Review Text *
              </label>
              <textarea
                value={editData.text}
                onChange={(e) => setEditData({ ...editData, text: e.target.value })}
                className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 min-h-[100px] resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Review text..."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Author
                </label>
                <input
                  type="text"
                  value={editData.author}
                  onChange={(e) => setEditData({ ...editData, author: e.target.value })}
                  className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Author name..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="text"
                  value={editData.date_text}
                  onChange={(e) => setEditData({ ...editData, date_text: e.target.value })}
                  className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Date text..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!editData.text.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                💾 Save
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="px-4 py-2 text-gray-300 border border-gray-600 rounded hover:bg-gray-700 transition-colors"
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      );
    }

    const displayDate = review.date_text || review.date || '';

    return (
      <div className="border border-gray-700 rounded-lg p-4 mb-3 hover:bg-gray-800 hover:shadow-sm transition-all duration-200 bg-gray-800">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                review.type === 'individual' 
                  ? 'bg-green-900 text-green-300' 
                  : 'bg-purple-900 text-purple-300'
              }`}>
                {review.type === 'individual' ? '👤 Individual Review' : '⭐ Recommendation'}
              </span>
              {review.source && (
                <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-full">
                  {review.source}
                </span>
              )}
            </div>
            <p className="text-gray-200 mb-2 whitespace-pre-wrap leading-relaxed">{review.text}</p>
            <div className="text-sm text-gray-400">
              {review.author && <span className="font-medium text-gray-300">{review.author}</span>}
              {review.author && displayDate && <span className="mx-2">•</span>}
              {displayDate && <span>{displayDate}</span>}
            </div>
          </div>
          <div className="flex gap-1 ml-4">
            <button
              onClick={() => setEditingId(review.id)}
              className="p-2 text-blue-400 hover:bg-blue-900 rounded transition-colors"
              title="Edit Review"
            >
              ✏️
            </button>
            <button
              onClick={() => handleDelete(review.id)}
              className="p-2 text-red-400 hover:bg-red-900 rounded transition-colors"
              title="Delete Review"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-white">
              📝 Review Management
            </h2>
            <p className="text-sm text-gray-300 mt-1">
              {contact?.name || contact?.first_name || 'Unknown Contact'} - ID: {contact?.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl p-1 hover:bg-gray-700 rounded transition-colors"
            title="Close Modal"
          >
            ❌
          </button>
        </div>

        {/* Message Bar */}
        {message.text && (
          <div className={`p-4 ${message.type === 'success' ? 'bg-green-900 text-green-300 border-green-700' : 'bg-red-900 text-red-300 border-red-700'} border-b`}>
            <div className="flex items-center">
              <span className="mr-2">{message.type === 'success' ? '✅' : '❌'}</span>
              {message.text}
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="p-4 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-medium text-gray-200">
                Reviews ({reviews.length})
              </h3>
              <button
                onClick={fetchReviews}
                disabled={loading}
                className="px-3 py-1 text-blue-400 border border-blue-600 rounded hover:bg-blue-900 transition-colors disabled:opacity-50"
                title="Refresh Reviews"
              >
                🔄 Refresh
              </button>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm"
            >
              ➕ Add Review
            </button>
          </div>
        </div>

        {/* Content */}
                {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-900">
          {/* Add Form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-gray-800 border border-gray-700 rounded-lg">
              <h4 className="text-lg font-medium text-white mb-4">Add New Review</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Review Text *
                  </label>
                  <textarea
                    value={formData.text}
                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                    className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 min-h-[100px] resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter review text..."
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Author
                    </label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Author name..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Date
                    </label>
                    <input
                      type="text"
                      value={formData.date_text}
                      onChange={(e) => setFormData({ ...formData, date_text: e.target.value })}
                      className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Date text..."
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAdd}
                    disabled={!formData.text.trim() || loading}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    💾 Save Review
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-gray-300 border border-gray-600 rounded hover:bg-gray-700 transition-colors"
                  >
                    ❌ Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reviews List */}
          <div>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-4 text-gray-400 text-lg">Loading reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-lg font-medium mb-2 text-gray-300">No reviews found</h3>
                <p className="text-sm mb-4">This contact doesn't have any reviews yet.</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  ➕ Add First Review
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-4 text-sm text-gray-400">
                  Showing {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                </div>
                {reviews.map((review) => (
                  <EditableReview key={review.id} review={review} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 bg-gray-800">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">
              💡 Tip: Click ✏️ to edit or 🗑️ to delete any review
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewManagementModal;
