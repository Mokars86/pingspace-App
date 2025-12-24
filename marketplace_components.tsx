// Enhanced Marketplace Screen Implementation
// This file contains the complete marketplace UI with all features
// Copy this content to replace the MarketplaceScreen in TabScreens.tsx

import React, { useState, useEffect } from 'react';
import { useGlobalState, useGlobalDispatch } from '../store';
import { api } from '../services/api';
import {
    Search, Grid, List, Plus, ShoppingCart, X, Star,
    Heart, MessageCircle, Truck, MapPin, Eye, Filter,
    ChevronDown, Loader2, Check, ArrowLeft
} from 'lucide-react';

// Star Rating Component
const StarRating: React.FC<{ rating: number; size?: 'sm' | 'md' | 'lg' }> = ({ rating, size = 'sm' }) => {
    const sizeClass = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5';
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={`${sizeClass} ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
            ))}
        </div>
    );
};

// Product Detail Modal
const ProductDetailModal: React.FC<{ productId: string; onClose: () => void }> = ({ productId, onClose }) => {
    const { productDetails, productReviews } = useGlobalState();
    const dispatch = useGlobalDispatch();
    const [loading, setLoading] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [reviewText, setReviewText] = useState('');
    const [reviewRating, setReviewRating] = useState(5);
    const [submittingReview, setSubmittingReview] = useState(false);

    const product = productDetails[productId];
    const reviews = productReviews[productId] || [];

    useEffect(() => {
        loadProductDetail();
    }, [productId]);

    const loadProductDetail = async () => {
        setLoading(true);
        try {
            const detail = await api.market.getProductDetail(productId);
            if (detail) {
                dispatch({ type: 'SET_PRODUCT_DETAIL', payload: { productId, detail } });
                await api.market.incrementViews(productId);
            }
            const productReviews = await api.market.getProductReviews(productId);
            dispatch({ type: 'SET_PRODUCT_REVIEWS', payload: { productId, reviews: productReviews } });
        } catch (e) {
            console.error('Load product detail error:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddReview = async () => {
        if (!reviewText.trim()) return;
        setSubmittingReview(true);
        try {
            const review = await api.market.addProductReview(productId, reviewRating, reviewText);
            dispatch({ type: 'ADD_PRODUCT_REVIEW', payload: { productId, review } });
            setReviewText('');
            setReviewRating(5);
            dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Review added!' } });
        } catch (e: any) {
            dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
        } finally {
            setSubmittingReview(false);
        }
    };

    if (loading || !product) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-50 dark:bg-slate-950">
            <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 p-4">
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
            </div>

            <div className="p-4 pb-32">
                {/* Product Image */}
                <div className="aspect-square bg-gray-100 dark:bg-slate-800 rounded-3xl overflow-hidden mb-4">
                    <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                </div>

                {/* Product Info */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-6 mb-4">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{product.title}</h1>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl font-black text-[#ff1744]">${product.price}</span>
                        <div className="flex items-center gap-1">
                            <StarRating rating={Math.round(product.ratingAvg)} size="md" />
                            <span className="text-sm text-slate-500">({product.reviewsCount})</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mb-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{product.viewsCount} views</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{product.location || 'Location'}</span>
                        </div>
                    </div>

                    <p className="text-slate-700 dark:text-slate-300 mb-4">{product.description}</p>

                    <div className="flex gap-2 mb-4">
                        <span className="px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded-full text-xs font-bold">{product.condition}</span>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded-full text-xs font-bold">{product.categoryName}</span>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded-full text-xs font-bold">Stock: {product.stockQuantity}</span>
                    </div>

                    {/* Seller Info */}
                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl">
                        <img src={product.sellerAvatar} alt={product.sellerName} className="w-12 h-12 rounded-full object-cover" />
                        <div className="flex-1">
                            <h4 className="font-black text-slate-900 dark:text-white">{product.sellerName}</h4>
                            <div className="flex items-center gap-2">
                                <StarRating rating={Math.round(product.sellerRating)} />
                                <span className="text-xs text-slate-500">({product.sellerReviewsCount} reviews)</span>
                            </div>
                        </div>
                        <button className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black">
                            Message
                        </button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mb-6">
                    <button
                        onClick={() => {
                            dispatch({ type: 'ADD_TO_CART', payload: { ...product, quantity: 1 } });
                            dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Added to cart!' } });
                        }}
                        className="flex-1 py-4 bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all"
                    >
                        Add to Cart
                    </button>
                    <button
                        onClick={() => setShowCheckout(true)}
                        className="flex-1 py-4 bg-[#ff1744] text-white rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-500/30"
                    >
                        Buy Now
                    </button>
                </div>

                {/* Reviews Section */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-6">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">Reviews ({reviews.length})</h3>

                    {/* Add Review */}
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-bold">Your Rating:</span>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <button key={i} onClick={() => setReviewRating(i)}>
                                        <Star className={`w-5 h-5 ${i <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Write your review..."
                            className="w-full bg-white dark:bg-slate-900 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20 mb-3"
                            rows={3}
                        />
                        <button
                            onClick={handleAddReview}
                            disabled={!reviewText.trim() || submittingReview}
                            className="px-4 py-2 bg-[#ff1744] text-white rounded-xl text-sm font-black hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Review'}
                        </button>
                    </div>

                    {/* Reviews List */}
                    <div className="space-y-4">
                        {reviews.map(review => (
                            <div key={review.id} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl">
                                <div className="flex items-start gap-3 mb-2">
                                    <img src={review.userAvatar} alt={review.userName} className="w-10 h-10 rounded-full object-cover" />
                                    <div className="flex-1">
                                        <h5 className="font-black text-sm">{review.userName}</h5>
                                        <div className="flex items-center gap-2">
                                            <StarRating rating={review.rating} />
                                            <span className="text-xs text-slate-500">{review.timestamp}</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-700 dark:text-slate-300">{review.reviewText}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Post Product Modal
const PostProductModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { productCategories } = useGlobalState();
    const dispatch = useGlobalDispatch();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        category: '',
        condition: 'new',
        location: '',
        stockQuantity: '1',
        shippingCost: '0',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'
    });

    useEffect(() => {
        if (isOpen && productCategories.length === 0) {
            loadCategories();
        }
    }, [isOpen]);

    const loadCategories = async () => {
        const categories = await api.market.getCategories();
        dispatch({ type: 'SET_PRODUCT_CATEGORIES', payload: categories });
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.price) return;
        setLoading(true);
        try {
            const product = await api.market.create({
                title: formData.title,
                description: formData.description,
                price: parseFloat(formData.price),
                category: formData.category,
                condition: formData.condition,
                location: formData.location,
                stockQuantity: parseInt(formData.stockQuantity),
                shippingCost: parseFloat(formData.shippingCost),
                image: formData.image
            });
            dispatch({ type: 'ADD_PRODUCT', payload: product });
            dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Product listed!' } });
            onClose();
        } catch (e: any) {
            dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl my-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Post Product</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Product Title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20"
                    />
                    <textarea
                        placeholder="Description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20"
                        rows={3}
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="number"
                            placeholder="Price"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20"
                        />
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20"
                        >
                            <option value="">Category</option>
                            {productCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <select
                        value={formData.condition}
                        onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20"
                    >
                        <option value="new">New</option>
                        <option value="like-new">Like New</option>
                        <option value="used">Used</option>
                        <option value="refurbished">Refurbished</option>
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="number"
                            placeholder="Stock"
                            value={formData.stockQuantity}
                            onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                            className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20"
                        />
                        <input
                            type="number"
                            placeholder="Shipping Cost"
                            value={formData.shippingCost}
                            onChange={(e) => setFormData({ ...formData, shippingCost: e.target.value })}
                            className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20"
                        />
                    </div>
                    <input
                        type="text"
                        placeholder="Location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20"
                    />
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-sm hover:scale-105 active:scale-95 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!formData.title || !formData.price || loading}
                        className="flex-1 py-3 bg-[#ff1744] text-white rounded-2xl font-bold text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Post Product
                    </button>
                </div>
            </div>
        </div>
    );
};

export { StarRating, ProductDetailModal, PostProductModal };
