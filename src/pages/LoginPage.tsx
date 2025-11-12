import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginModal from '../components/LoginModal';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    navigate('/', { replace: true });
  };

  const handleSignupRedirect = () => {
    setIsOpen(false);
    navigate('/signup');
  };

  const handleSuccess = () => {
    setIsOpen(false);
    navigate('/', { replace: true });
  };

  return (
    <div className="login-page-wrapper">
      <LoginModal
        isOpen={isOpen}
        onClose={handleClose}
        onSignupRedirect={handleSignupRedirect}
        onLoginSuccess={handleSuccess}
      />
    </div>
  );
};

export default LoginPage;
