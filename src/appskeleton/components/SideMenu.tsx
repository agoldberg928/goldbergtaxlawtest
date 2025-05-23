import React, { useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import MuiDrawer, { drawerClasses } from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import SelectContent from './SelectContent';
import MenuContent from './MenuContent';
import UserProfileOptionsMenu from './UserProfileOptionsMenu';
import { useMsal } from '@azure/msal-react';
import { GoogleAccount, GOOGLE_API_WRAPPER } from '../../client/GoogleApiClient';
import { Button } from '@mui/material';
import { Login } from '@mui/icons-material';

const drawerWidth = 240;

const Drawer = styled(MuiDrawer)({
  width: drawerWidth,
  flexShrink: 0,
  boxSizing: 'border-box',
  mt: 10,
  [`& .${drawerClasses.paper}`]: {
    width: drawerWidth,
    boxSizing: 'border-box',
  },
});

/**
 * Composite Component for the entire side menu
 */
export default function SideMenu() {
  const msal = useMsal()
  const azureActiveAccount = msal.instance.getActiveAccount()

  const [googleUser, setGoogleUser] = useState<GoogleAccount | undefined>(GOOGLE_API_WRAPPER.signedInUser)

  // initial load for google API stuff
  useEffect(() => GOOGLE_API_WRAPPER.refreshOnInit((signedInUser) => { setGoogleUser(signedInUser) }), [])

  return (
    <Drawer
      variant="permanent"
      sx={{
        display: { xs: 'none', md: 'block' },
        [`& .${drawerClasses.paper}`]: {
          backgroundColor: 'background.paper',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          mt: 'calc(var(--template-frame-height, 0px) + 4px)',
          p: 1.5,
        }}
      >
        <SelectContent />
      </Box>
      <Divider />
      <MenuContent />
      {/* Displays Google Account */}
      <Stack
        direction="row"
        sx={{
          p: 2,
          gap: 1,
          alignItems: 'center',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Avatar
          sizes="small"
          alt={googleUser?.name ?? "Please Sign In"}
          src={`${process.env.REACT_APP_BASE_PATH}images/google_logo.png`}
          sx={{ width: 36, height: 36 }}
        />
        <Box sx={{ mr: 'auto' }}>
          {googleUser ?
            <>
              <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: '16px' }}>
                {googleUser.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {googleUser.email}
              </Typography>
            </>
            :
            <Button variant="outlined" endIcon={<Login /> } color="warning" id="refresh_button" onClick={() => GOOGLE_API_WRAPPER.signIn((signedInUser) =>  setGoogleUser(signedInUser) )}>
                Sign in
            </Button>
          }
        </Box>
        {googleUser && <UserProfileOptionsMenu handleLogout={() => GOOGLE_API_WRAPPER.signOut(() => setGoogleUser(undefined))} />}
      </Stack>
      {/* Displays Microsoft Account */}
      <Stack
        direction="row"
        sx={{
          p: 2,
          gap: 1,
          alignItems: 'center',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Avatar
          sizes="small"
          alt={azureActiveAccount!.name}
          src={`${process.env.REACT_APP_BASE_PATH}images/azure_logo.png`}
          sx={{ width: 36, height: 36 }}
        />
        <Box sx={{ mr: 'auto' }}>
          <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: '16px' }}>
            {azureActiveAccount!.name}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {azureActiveAccount!.username}
          </Typography>
        </Box>
        <UserProfileOptionsMenu handleLogout={() => msal.instance.logoutRedirect({account: azureActiveAccount, postLogoutRedirectUri: process.env.REACT_APP_AZURE_FUNCTION_BASE_URL})}/>
      </Stack>
    </Drawer>
  );
}
