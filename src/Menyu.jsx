import React, { useState, useEffect, useRef } from 'react';
import { Clock, Tag, AlertCircle, Loader2 } from 'lucide-react';
import io from "socket.io-client";
import "./menyu.css"

function Menyu() {
  const heroRef = useRef(null);
  const [isSticky, setIsSticky] = useState(false);
  const [view, setView] = useState("menu");
  const [selectedCategory, setSelectedCategory] = useState("Barchasi");
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const API_BASE = "https://suddocs.uz";

  // Socket.IO connection
  useEffect(() => {
    const newSocket = io(API_BASE, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    // Listen for product updates
    newSocket.on('productUpdate', (updatedProduct) => {
      console.log('Product updated:', updatedProduct);
      setDishes(prevDishes => 
        prevDishes.map(dish => 
          dish.id === updatedProduct.id ? updatedProduct : dish
        )
      );
    });

    // Listen for new products
    newSocket.on('newProduct', (newProduct) => {
      console.log('New product added:', newProduct);
      setDishes(prevDishes => [...prevDishes, newProduct]);
      
      // Update categories if new category is added
      if (newProduct.category && 
          !categories.some(cat => cat.id === newProduct.category.id)) {
        setCategories(prevCategories => [...prevCategories, newProduct.category]);
      }
    });

    // Listen for product deletion
    newSocket.on('productDeleted', (productId) => {
      console.log('Product deleted:', productId);
      setDishes(prevDishes => 
        prevDishes.filter(dish => dish.id !== productId)
      );
    });

    // Listen for category updates
    newSocket.on('categoryUpdate', (updatedCategories) => {
      console.log('Categories updated:', updatedCategories);
      setCategories(updatedCategories);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [API_BASE]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/product`);
        if (!response.ok) {
          throw new Error('Ma\'lumotlarni yuklashda xatolik');
        }
        const data = await response.json();
        
        setDishes(data);
        
        const uniqueCategories = data
          .filter(dish => dish.category) 
          .map(dish => dish.category)
          .filter((category, index, self) => 
            self.findIndex(c => c.id === category.id) === index
          );
        
        setCategories(uniqueCategories);
      } catch (err) {
        setError(err.message);
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const heroBottom = heroRef.current.getBoundingClientRect().bottom;
        setIsSticky(heroBottom <= 0);
      }
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Debug connection status
  useEffect(() => {
    console.log('Connection status changed:', isConnected);
  }, [isConnected]);

  const filteredDishes = selectedCategory === "Barchasi" 
    ? dishes 
    : dishes.filter(dish => 
        dish.category && dish.category.name === selectedCategory
      );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Menyu yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <div className="error-icon">
            <AlertCircle size={24} />
          </div>
          <h2 className="error-title">Xatolik yuz berdi</h2>
          <p className="error-message">{error}</p>
          <button 
            className="error-button"
            onClick={() => window.location.reload()}
          >
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="menyu-container">
      {/* Connection Status & Sticky Navigation */}
      <div className="sticky-nav fixed" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        padding: '16px'
      }}>
        <div className="connection-status" style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 16px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '4px',
          marginBottom: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <div 
            className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              marginRight: '8px',
              backgroundColor: isConnected ? '#22c55e' : '#ef4444'
            }}
          ></div>
          <span className="connection-text" style={{
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {isConnected ? 'Ulangan' : 'Ulanmagan'}
          </span>
        </div>
        
        {view === "menu" && (
          <div className="nav-content">
            <div className="nav-buttons">
              <button
                className={`nav-button ${selectedCategory === "Barchasi" ? "active" : "inactive"}`}
                onClick={() => setSelectedCategory("Barchasi")}
              >
                Barchasi
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`nav-button ${selectedCategory === category.name ? "active" : "inactive"}`}
                  onClick={() => setSelectedCategory(category.name)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Menu Section */}
      {view === "menu" && (
        <section className={`menu-section ${isSticky ? 'with-margin' : ''}`} style={{
          marginTop: '120px' // Sticky nav uchun joy qoldirish
        }}>
          <div className="menu-container">
            <h2 className="menu-title">
              Bizning Menyu
            </h2>
            
            {filteredDishes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Loader2 size={24} className="animate-spin" />
                </div>
                <p className="empty-text">Hozircha bu kategoriyada taom mavjud emas</p>
              </div>
            ) : (
              <div className="menu-grid">
                {filteredDishes.map((dish) => (
                  <div key={dish.id} className="dish-card">
                    <div className="dish-image-container">
                      <img 
                        src={dish.image ? `${API_BASE}${dish.image}` : '/api/placeholder/300/200'} 
                        alt={dish.name || 'Taom'} 
                        className="dish-image"
                        onError={(e) => {
                          e.target.src = '/api/placeholder/300/200';
                        }}
                      />
                    </div>
                    
                    <div className="dish-content">
                      <div className="dish-price-badge">
                        <span className="dish-price">
                          {dish.price ? `${parseInt(dish.price).toLocaleString()} so'm` : 'Narx so\'raladi'}
                        </span>
                      </div>
                      <h3 className="dish-name">
                        {dish.name || 'Nomi ko\'rsatilmagan'}
                      </h3>
                      <div className="dish-meta">
                        {(dish.date !== null && dish.date !== undefined && dish.date !== "") && (
                          <span className="dish-meta-item">
                            <Clock size={16} /> {dish.date} daqiqa
                          </span>
                        )}
                        {dish.category && (
                          <span className="dish-meta-item">
                            <Tag size={16} />
                            {dish.category.name}
                          </span>
                        )}
                      </div>
                      {dish.description && (
                        <p className="dish-description">
                          {dish.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default Menyu;