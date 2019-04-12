import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Camera, CameraOptions, PictureSourceType } from '@ionic-native/camera/ngx';
import { ActionSheetController, ToastController, Platform, LoadingController } from '@ionic/angular';
import { File, FileEntry } from '@ionic-native/file/ngx';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { Storage } from '@ionic/storage';
import { FilePath } from '@ionic-native/file-path/ngx';

import { finalize, tap } from 'rxjs/operators';
// import { HTTP } from '@ionic-native/http/ngx';


const STORAGE_KEY = 'my_images';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {

  images = [];
  currentImageEntry = null;

  constructor(private camera: Camera,
    private file: File,
    private http: HttpClient,
    private webview: WebView,
    private actionSheetController: ActionSheetController,
    private toastController: ToastController,
    private storage: Storage,
    private platform: Platform,
    private loadingController: LoadingController,
    private ref: ChangeDetectorRef,
    private filePath: FilePath) { }

  ngOnInit() {
    this.platform.ready().then(() => {
      this.loadStoredImages();
    });
  }

  loadStoredImages() {
    this.storage.get(STORAGE_KEY).then(images => {
      if (images) {
        const arr = JSON.parse(images);
        this.images = [];
        for (const img of arr) {
          const filePath = this.file.dataDirectory + img;
          const resPath = this.pathForImage(filePath);
          this.images.push({ name: img, path: resPath, filePath: filePath });
        }
      }
    });
  }

  pathForImage(img) {
    if (img === null) {
      return '';
    } else {
      const converted = this.webview.convertFileSrc(img);
      return converted;
    }
  }

  async presentToast(text) {
    const toast = await this.toastController.create({
      message: text,
      position: 'bottom',
      duration: 3000
    });
    toast.present();
  }

  // Next functions follow here...
  async selectImage() {
    this.takePicture(this.camera.PictureSourceType.CAMERA);
    /*const actionSheet = await this.actionSheetController.create({
      header: 'Select Image source',
      buttons: [{
        text: 'Load from Library',
        handler: () => {
          this.takePicture(this.camera.PictureSourceType.PHOTOLIBRARY);
        }
      },
      {
        text: 'Use Camera',
        handler: () => {
          this.takePicture(this.camera.PictureSourceType.CAMERA);
        }
      },
      {
        text: 'Cancel',
        role: 'cancel'
      }
      ]
    });
    await actionSheet.present();*/
  }

  takePicture(sourceType: PictureSourceType) {
    const options: CameraOptions = {
      quality: 100,
      sourceType: sourceType,
      saveToPhotoAlbum: false,
      correctOrientation: true
    };

    this.camera.getPicture(options).then(imagePath => {
      if (this.platform.is('android') && sourceType === this.camera.PictureSourceType.PHOTOLIBRARY) {
        this.filePath.resolveNativePath(imagePath)
          .then(filePath => {
            const correctPath = filePath.substr(0, filePath.lastIndexOf('/') + 1);
            const currentName = imagePath.substring(imagePath.lastIndexOf('/') + 1, imagePath.lastIndexOf('?'));
            this.copyFileToLocalDir(correctPath, currentName, this.createFileName());
          });
      } else {
        const currentName = imagePath.substr(imagePath.lastIndexOf('/') + 1);
        const correctPath = imagePath.substr(0, imagePath.lastIndexOf('/') + 1);
        this.copyFileToLocalDir(correctPath, currentName, this.createFileName());
      }
    });

  }
  createFileName() {
    const d = new Date(),
      n = d.getTime(),
      newFileName = n + '.jpg';
    return newFileName;
  }

  copyFileToLocalDir(namePath, currentName, newFileName) {
    this.file.copyFile(namePath, currentName, this.file.dataDirectory, newFileName).then(success => {
      this.updateStoredImages(newFileName);
    }, error => {
      this.presentToast('Error while storing file.');
    });
  }

  updateStoredImages(name) {
    this.storage.get(STORAGE_KEY).then(images => {
      const arr = JSON.parse(images);
      if (!arr) {
        const newImages = [name];
        this.storage.set(STORAGE_KEY, JSON.stringify(newImages));
      } else {
        arr.push(name);
        this.storage.set(STORAGE_KEY, JSON.stringify(arr));
      }

      const filePath = this.file.dataDirectory + name;
      const resPath = this.pathForImage(filePath);

      const newEntry = {
        name: name,
        path: resPath,
        filePath: filePath
      };

      this.images = [newEntry, ...this.images];
      this.ref.detectChanges(); // trigger change detection cycle
    });
  }
  deleteImage(imgEntry, position) {
    this.images.splice(position, 1);

    this.storage.get(STORAGE_KEY).then(images => {
      const arr = JSON.parse(images);
      const filtered = arr.filter(name => name !== imgEntry.name);
      this.storage.set(STORAGE_KEY, JSON.stringify(filtered));

      const correctPath = imgEntry.filePath.substr(0, imgEntry.filePath.lastIndexOf('/') + 1);

      this.file.removeFile(correctPath, imgEntry.name).then(res => {
        this.presentToast('File removed.');
      });
    });
  }

  startUpload(imgEntry) {
    this.currentImageEntry = imgEntry;
    this.file.resolveLocalFilesystemUrl(imgEntry.filePath)

      .then(entry => {
        (<FileEntry>entry).file(file => this.readFile(file));
      })
      .catch(err => {
        this.presentToast('Error while reading file.');
      });
    // this.readFile(imgEntry);
  }

  readFile(file: any) {
    const reader = new FileReader();
    reader.onloadend = () => {
      const formData = new FormData();
      const imgBlob = new Blob([reader.result], {
        type: file.type
      });
      formData.append('file', imgBlob, file.name);
      formData.append('title', file.name);
      formData.append('name', file.name);

      formData.append('description', 'Camera App Upload');
      formData.append('author', 'rsvuser');
      formData.append('destination', '9999/99991234/Baseline/XC');
      formData.append('mimetype', 'image/jpeg');
      formData.append('nodeid', 'workspace://SpacesStore/a90022f6-1ee7-4d1d-ad85-98f6439eb17c');
      formData.append('jhove_ClinicalTrialProtocolID', 'DemoPhotography');
      formData.append('jhove_ClinicalTrialProtocolName', 'DemoPhotography');
      formData.append('jhove_ClinicalTrialSiteID', '9999');
      formData.append('jhove_ClinicalTrialSubjectID', '99991234');
      formData.append('jhove_PatientID', '99991234');
      formData.append('jhove_ClinicalTrialTimePointID', 'V1');
      formData.append('jhove_ClinicalTrialTimePointDescription', 'Baseline');
      formData.append('jhove_StudyDate', '20190101');
      formData.append('jhove_Modality', 'XC');
      formData.append('jhove_ImportType', 'NonDicom');


      this.uploadImageData(formData);
    };
    reader.readAsArrayBuffer(file);
    // this.uploadImageData(file);
  }
  // async uploadImageData(file: any) {
  // console.log(file);
  async uploadImageData(formData: FormData) {
    const loading = await this.loadingController.create({
      message: 'Uploading image...',
      spinner: 'crescent',
      duration: 2000
    });
    await loading.present();


    const httpOptions = {
      headers: new HttpHeaders({
        // 'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa('rsvuser:User@123'),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT',
        'Accept': 'application/json'

      })
    };

    const headers = {
      // 'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa('rsvuser:User@123')
    };

    // this.http.useBasicAuth('rsvuser', 'User@123');
    this.http.post('https://34.201.232.224/alfresco/service/mis/uploadNew.json', formData, httpOptions)
      .subscribe(
        (val) => {
          console.log('POST call successful value returned in body', val);
          this.presentToast('File upload complete.');
          loading.dismiss();
        },
        response => {

          if (response.status === 200) {
            console.log('POST call successful value returned in body');
            this.presentToast('File upload complete.');
            this.deleteImage(this.currentImageEntry, 0);
            loading.dismiss();
          } else {
            console.log('POST call in error', response);
            this.presentToast('File upload failed.');
            loading.dismiss();
          }
        },
        () => {
          console.log('The POST observable is now completed.');

        });

    /*.pipe(
      tap(res => {
        console.log(res);
        if (res['success']) {
          this.presentToast('File upload complete.');
        } else {
          this.presentToast('File upload failed.');
        }
      }),
      finalize(() => {
        loading.dismiss();
      })
    )
    .subscribe(res => {
      console.log(res);
    });*/
    /* .then(data => {
       this.presentToast('File upload complete.');

     })
     .catch(error => {

       this.presentToast('File upload failed.' + error);

     }).finally(() => {
       loading.dismiss();
     });*/

    /*const params = {
      'title': file.name,
      'name': file.name,

      'description': 'Camera App Upload',
      'author': 'rsvuser',
      'destination': 'camera-app-dest',
      'mimetype': 'image/jpeg',
      'nodeid': 'workspace://SpacesStore/3250ef9c-fd5a-4176-af70-6089c90cde31'
    };

    this.http.uploadFile('https://rsvbayer1.corelabinabox.com/alfresco/service/mis/uploadNew',
      params,
      { Authorization: 'Basic ' + btoa('rsvuser:User@123') }, file.filePath, file.name)
      .then(data => {

        this.presentToast('File upload complete.');

      })
      .catch(error => {

        this.presentToast('File upload failed.' + error);
        console.log(error);

      }).finally(() => {
        loading.dismiss();
      });*/



  }
}
