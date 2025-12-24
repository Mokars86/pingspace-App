-- ============================================
-- MARKETPLACE ENHANCEMENT MIGRATION
-- ============================================
-- Run this in Supabase SQL Editor after the main schema

-- ============================================
-- 1. PRODUCT CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default categories
INSERT INTO product_categories (name, icon) VALUES
  ('Electronics', '💻'),
  ('Fashion', '👕'),
  ('Home & Garden', '🏠'),
  ('Sports', '⚽'),
  ('Books', '📚'),
  ('Toys', '🧸'),
  ('Beauty', '💄'),
  ('Automotive', '🚗'),
  ('Food', '🍔'),
  ('Other', '📦')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. PRODUCT REVIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  review_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user ON product_reviews(user_id);

-- ============================================
-- 3. SELLER RATINGS
-- ============================================
CREATE TABLE IF NOT EXISTS seller_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  review TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(transaction_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_seller_ratings_seller ON seller_ratings(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_ratings_buyer ON seller_ratings(buyer_id);

-- ============================================
-- 4. PRODUCT TAGS
-- ============================================
CREATE TABLE IF NOT EXISTS product_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_tags_product ON product_tags(product_id);
CREATE INDEX IF NOT EXISTS idx_product_tags_tag ON product_tags(tag);

-- ============================================
-- 5. ENHANCE PRODUCTS TABLE
-- ============================================
ALTER TABLE products
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id),
ADD COLUMN IF NOT EXISTS condition VARCHAR(20) DEFAULT 'new',
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_avg DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS location TEXT;


-- ============================================
-- 6. ENHANCE PROFILES TABLE
-- ============================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS seller_rating_avg DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS seller_reviews_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_sales INTEGER DEFAULT 0;

-- ============================================
-- 7. TRIGGERS & FUNCTIONS
-- ============================================

-- Update product rating when review is added/updated/deleted
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET 
    rating_avg = COALESCE((
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM product_reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    ), 0),
    reviews_count = (
      SELECT COUNT(*)
      FROM product_reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_rating ON product_reviews;
CREATE TRIGGER trigger_update_product_rating
AFTER INSERT OR UPDATE OR DELETE ON product_reviews
FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- Update seller rating when rating is added/updated/deleted
CREATE OR REPLACE FUNCTION update_seller_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET 
    seller_rating_avg = COALESCE((
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM seller_ratings
      WHERE seller_id = COALESCE(NEW.seller_id, OLD.seller_id)
    ), 0),
    seller_reviews_count = (
      SELECT COUNT(*)
      FROM seller_ratings
      WHERE seller_id = COALESCE(NEW.seller_id, OLD.seller_id)
    )
  WHERE id = COALESCE(NEW.seller_id, OLD.seller_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_seller_rating ON seller_ratings;
CREATE TRIGGER trigger_update_seller_rating
AFTER INSERT OR UPDATE OR DELETE ON seller_ratings
FOR EACH ROW EXECUTE FUNCTION update_seller_rating();

-- Increment product views
CREATE OR REPLACE FUNCTION increment_product_views(product_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products
  SET views_count = views_count + 1
  WHERE id = product_id;
END;
$$;

-- ============================================
-- 8. ROW LEVEL SECURITY
-- ============================================

-- Product Reviews RLS
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product reviews"
  ON product_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews for products they purchased"
  ON product_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON product_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON product_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Seller Ratings RLS
ALTER TABLE seller_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view seller ratings"
  ON seller_ratings FOR SELECT
  USING (true);

CREATE POLICY "Buyers can create ratings for their transactions"
  ON seller_ratings FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can update their own ratings"
  ON seller_ratings FOR UPDATE
  USING (auth.uid() = buyer_id);

-- Product Tags RLS
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product tags"
  ON product_tags FOR SELECT
  USING (true);

CREATE POLICY "Product owners can manage tags"
  ON product_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_tags.product_id
      AND products.seller_id = auth.uid()
    )
  );

-- Product Categories RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON product_categories FOR SELECT
  USING (true);

-- ============================================
-- 9. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = true;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
