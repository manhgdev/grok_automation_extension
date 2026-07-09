import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';

import Button from 'primevue/button';
import Card from 'primevue/card';
import ConfirmDialog from 'primevue/confirmdialog';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import InputNumber from 'primevue/inputnumber';
import ToggleSwitch from 'primevue/toggleswitch';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import SelectButton from 'primevue/selectbutton';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import Tag from 'primevue/tag';
import Toast from 'primevue/toast';
import ProgressBar from 'primevue/progressbar';

const components = {
  PButton: Button,
  PCard: Card,
  PConfirmDialog: ConfirmDialog,
  PDialog: Dialog,
  PSelect: Select,
  PMultiSelect: MultiSelect,
  PInputNumber: InputNumber,
  PInputSwitch: ToggleSwitch,
  PToggleSwitch: ToggleSwitch,
  PInputText: InputText,
  PInputTextarea: Textarea,
  PSelectButton: SelectButton,
  PTabs: Tabs,
  PTabList: TabList,
  PTab: Tab,
  PTabPanels: TabPanels,
  PTabPanel: TabPanel,
  PTag: Tag,
  PToast: Toast,
  PProgressBar: ProgressBar,
};

export function installPrimeVue(app) {
  app.use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        prefix: 'p',
        darkModeSelector: '.dark',
        cssLayer: false,
      },
    },
    ripple: true,
  });
  app.use(ToastService);
  app.use(ConfirmationService);
  app.directive('tooltip', Tooltip);

  for (const [name, component] of Object.entries(components)) {
    app.component(name, component);
  }
}
