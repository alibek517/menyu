import React, { useState, useEffect, useRef } from 'react';
import { Clock, Tag, AlertCircle, Loader2, Wifi, WifiOff, RefreshCw } from 'lucide-react';
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

  // Socket.IO ulanishi
  useEffect(() => {
    console.log('Socket ulanishini boshlash...');
    
    const newSocket = io(API_BASE, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
      autoConnect: true,
    });

    // Ulanish hodisalari
    newSocket.on('connect', () => {
      console.log('✅ Socket ulandi:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket uzildi:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔴 Socket ulanish xatosi:', error);
      setIsConnected(false);
    });

    // BARCHA eventlarni tinglash - serverdan qanday eventlar kelayotganini bilish uchun
    newSocket.onAny((eventName, ...args) => {
      console.log('📡 Kelgan event:', eventName, args);
    });

    // Turli xil event nomlarini sinab ko'rish
    const eventNames = [
      'productUpdate',
      'newProduct', 
      'productDeleted',
      'categoryUpdate',
      'product_created',
      'product_updated', 
      'product_deleted',
      'menu_updated',
      'data_changed',
      'refresh'
    ];

    eventNames.forEach(eventName => {
      newSocket.on(eventName, (data) => {
        console.log(`🔔 ${eventName} eventi keldi:`, data);
        
        // Har qanday yangi mahsulot eventida yangilash
        if (eventName.includes('product') || eventName.includes('new') || eventName.includes('created')) {
          if (data && (data.id || data.product)) {
            const product = data.product || data;
            console.log('➕ Yangi mahsulot qo\'shilmoqda:', product);
            
            setDishes(prevDishes => {
              const exists = prevDishes.find(dish => dish.id === product.id);
              if (exists) return prevDishes;
              
              const newDishes = [...prevDishes, product];
              console.log('✅ Yangi taom qo\'shildi. Jami:', newDishes.length);
              return newDishes;
            });

            // Kategoriya yangilash
            if (product.category) {
              setCategories(prevCategories => {
                const exists = prevCategories.find(cat => cat.id === product.category.id);
                if (!exists) {
                  return [...prevCategories, product.category];
                }
                return prevCategories;
              });
            }
          }
        }

        // Yangilanish eventlari
        if (eventName.includes('update') && data && data.id) {
          console.log('🔄 Mahsulot yangilanmoqda:', data);
          setDishes(prevDishes => 
            prevDishes.map(dish => dish.id === data.id ? data : dish)
          );
        }

        // O'chirish eventlari
        if (eventName.includes('delet') && data) {
          const productId = data.id || data;
          console.log('🗑️ Mahsulot o\'chirilmoqda:', productId);
          setDishes(prevDishes => 
            prevDishes.filter(dish => dish.id !== productId)
          );
        }

        // Umumiy yangilanish
        if (eventName.includes('refresh') || eventName.includes('menu_updated')) {
          console.log('🔄 Umumiy yangilanish - ma\'lumotlarni qayta yuklash');
          // Sahifani yangilamasdan ma'lumotlarni qayta yuklash
          fetchProductsAgain();
        }
      });
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      console.log('Socket yopilmoqda...');
      newSocket.close();
    };
  }, [API_BASE]);

  // Ma'lumotlarni qayta yuklash funksiyasi
  const fetchProductsAgain = async () => {
    try {
      console.log('🔄 Ma\'lumotlar qayta yuklanmoqda...');
      const response = await fetch(`${API_BASE}/product`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Yangi ma\'lumotlar yuklandi:', data.length, 'ta taom');
        setDishes(data);
        
        // Kategoriyalarni yangilash
        const uniqueCategories = data
          .filter(dish => dish.category)
          .map(dish => dish.category)
          .filter((category, index, self) => 
            self.findIndex(c => c.id === category.id) === index
          );
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('❌ Qayta yuklashda xatolik:', error);
    }
  };

  // Boshlang'ich ma'lumotlarni yuklash
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log('API dan ma\'lumotlar yuklanmoqda...');
        setLoading(true);
        
        const response = await fetch(`${API_BASE}/product`);
        if (!response.ok) {
          throw new Error('Ma\'lumotlarni yuklashda xatolik');
        }
        
        const data = await response.json();
        console.log('API dan kelgan ma\'lumotlar:', data.length, 'ta taom');
        
        setDishes(data);
        
        // Kategoriyalarni ajratib olish
        const uniqueCategories = data
          .filter(dish => dish.category) 
          .map(dish => dish.category)
          .filter((category, index, self) => 
            self.findIndex(c => c.id === category.id) === index
          );
        
        console.log('Topilgan kategoriyalar:', uniqueCategories.length);
        setCategories(uniqueCategories);
        
      } catch (err) {
        console.error('❌ API xatosi:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [API_BASE]);

  // Scroll hodisasi
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

  // Filtrlangan taomlar
  const filteredDishes = selectedCategory === "Barchasi" 
    ? dishes 
    : dishes.filter(dish => 
        dish.category && dish.category.name === selectedCategory
      );

  console.log('Hozirgi holat:', {
    jami_taomlar: dishes.length,
    filtrlangan_taomlar: filteredDishes.length,
    tanlangan_kategoriya: selectedCategory,
    wifi_ulangan: isConnected
  });

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
      {/* Sticky Navigation */}
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
        {/* WiFi holati */}
        <div className="connection-status" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '4px',
          marginBottom: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {isConnected ? (
              <Wifi size={16} color="#22c55e" style={{ marginRight: '8px' }} />
            ) : (
              <WifiOff size={16} color="#ef4444" style={{ marginRight: '8px' }} />
            )}
            <span style={{ fontSize: '14px', fontWeight: '500' }}>
              WiFi: {isConnected ? 'Ulangan' : 'Uzilgan'}
            </span>
          </div>
          
          <div>
            <button 
              onClick={() => {
                fetchProductsAgain();
                if (socket) {
                  socket.disconnect();
                  socket.connect();
                }
              }}
              style={{
                padding: '6px 12px',
                fontSize: '14px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={14} /> Yangilash
            </button>
          </div>
        </div>
        
        {/* Kategoriya tugmalari */}
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

      {/* Menyu */}
      {view === "menu" && (
        <section className={`menu-section ${isSticky ? 'with-margin' : ''}`} style={{
          marginTop: '120px'
        }}>
          <div className="menu-container">
            <h2 className="menu-title">Bizning Menyu</h2>
            
            {filteredDishes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Loader2 size={24} />
                </div>
                <p className="empty-text">
                  {selectedCategory === "Barchasi" 
                    ? "Hech qanday taom topilmadi"
                    : `"${selectedCategory}" da hech qanday taom yo'q`
                  }
                </p>
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