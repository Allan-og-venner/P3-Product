
/*
New To Do

Comment code
Hvis man klikker på projectet DTG. redirect localhost:3000/{user}/DTG/
IKON MODAL GÅR UNDER NAV BAR!!!!!!!!!!!!!!!!!!!!!!!! - Done
Get Username from token - Done
Check Token - Done
Describe Integration Tests
Active / History Tabs Stay right below NavBar


*/

'use client'
import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import FileSystemService from "@/app/(admin)/components/FileSystemService";
import ServerSidePaths from '@/app/(admin)/components/ServerSidePaths';
import {Project, ProjectObject} from '@/app/(admin)/components/projectClass';
import {ProjectInterface, projectObject, actionProject, modalOperator} from '@/app/(admin)/interfaces/interfaces';
import { TitleDuplicateException } from "@/app/(admin)/exceptions/TitleDuplicateException";
import { CreateWhileEdit } from "@/app/(admin)/exceptions/CreateWhileEditException";
import { EditWhileCreating } from "@/app/(admin)/exceptions/EditWhileCreating";
import { EditingAlreadyActive } from "@/app/(admin)/exceptions/EditingAlreadyActiveException";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { validateProjectData } from "@/app/(admin)/lib/validation/project";
import { z } from "zod";
import Link from 'next/link';
import { APIHandle } from "@/app/(admin)/classes/handlerClass";
import { log } from "console";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useAuth } from "@/app/(admin)/context/Auth";



export default function ProjectPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  
  const [user, setUser] = useState("");
  
  const [openTab, setOpenTab] = useState<number>(1);
  const [modalOpen, setModalOpen] = useState<modalOperator>({currentModalTitle: "", isOpen: false});

  const [icons, setIcons] = useState<string[]>([]);
  const [projects, setProjects] = useState<ProjectObject[]>([]);
  
  const [actionOnProject, setActionOnProject] = useState<actionProject>({projectTitle:"", projectIndex: -1});
  
  const [creatingProject, setCreating] = useState<boolean>(false);
  const [newProject, setNewProject] = useState<Project>(new Project());


  useEffect(() => {
    const token = Cookies.get("token");
    console.log(token)
    if (!token) {
      logout();
      router.replace("/login"); // If no token is found, redirect to login page
      return;
    }
      // Validate the token by making an API call
      const validateToken = async () => {
        try {
          const res = await fetch("/api/protected", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
  
          if (!res.ok) {throw new Error("Token validation failed");}
        } catch (error) {
          console.error(error);
          logout();
          router.replace("/login"); // Redirect to login if token validation fails
        } finally {
          setIsLoading(false);
        }
      };
  
      validateToken();

      FileSystemService.APIRequestUser().then(async (data) => {
        setUser(await data.Id);
        getProjects(data.Id);
      });
   
    //Sets the div 'outerDiv' as the appElement of the modals, 
    //such that the page content inside the div is hidden when a modal is in use.
    const appElement: HTMLElement | null = document.getElementById('outerDiv');
    if (appElement) {
      Modal.setAppElement(appElement);
    }

    FileSystemService.listFiles(ServerSidePaths.getIconsPath()).then((iconFiles) => {
      setIcons(iconFiles);
    });
    
    
    
    
  }, []);
  
  if (isLoading) {
    // You can display a loading indicator here if needed
    return <div>Loading...</div>;
  }
 
  const URLIconsPath = ServerSidePaths.getURLIconsPath();

  /**
   * Function that calls the getJSONFile function,
   *  which returns all of the users projects as an array of ProjectInterfaces. 
   * The projects get redefined as ProjectObjects and are set as the state projects.
   */
  async function getProjects(theUser: string) {
    
    console.log("get projects user ", user);
    
    const data: ProjectInterface[] = await FileSystemService.getJSONFile(ServerSidePaths.getProjectsPath(theUser)) as ProjectInterface[];
    
    const modifiedData = data.map((project) => {
      // Assuming project.title is the property you want to modify
      const modifiedTitle = project.title.replace(/-/g, ' '); // Replace all occurrences of '-' with a space
    
      // Return a new object with the modified title
      return { ...project, title: modifiedTitle };
    });
    
    const projectsWithBeingEdited: ProjectObject[] = modifiedData.map((projectData) => {return new ProjectObject(projectData)});
    setProjects(projectsWithBeingEdited);

  }
  
  
  /**
   * useEffect is called when the page renders. 
   * Calls the listFiles function which returns icons and sets them as the state of Icons.
   * Also calls the getProjects function. 
   */
  const fetchData = async () => {
    try {
      await FileSystemService.APIRequestUser().then((data)=>{
        console.log(data.Id);
        setUser(data.Id);
      });
     
  
     

      console.log(user);
      
      // Now, user state has been updated, and you can log it
      

      // Rest of your code
      const appElement: HTMLElement | null = document.getElementById('outerDiv');
      if (appElement) {
        Modal.setAppElement(appElement);
      }

      const iconFiles = await FileSystemService.listFiles(ServerSidePaths.getIconsPath());
      setIcons(iconFiles);

      getProjects(user);
    } catch (error) {
      // Handle errors here
      console.error("Error fetching user data:", error);
    }
  };
  

  

  /**
   * getProjectDataArray returns an array with each field of a project for all the projects. 
   * This data is modified with its properties and then written to the project database with the
   * writeToJSONFile function. 
   */
  async function formattingProjectData() {
    
    const data = projects.map((project) => project.getProjectDataArray()); 

    const transformedData = data.map(([title, isActive, icon]) => {
      // Replace spaces with hyphens in the title
      const modifiedTitle = title.replace(/ /g, '-');
    
      // Return a new object with the modified title and other properties
      return {
        title: modifiedTitle,
        isActive,
        icon,
      };
    });

    await FileSystemService.writeToJSONFile(transformedData, ServerSidePaths.getProjectsPath(user));
    console.log(ServerSidePaths.getProjectsPath(user));

  }

  /**
   * Handles when an icon is uploaded. 
   * Sets a variable 'file' as the file at index[0] if more files are uploaded. 
   * Creates new FormData with the file as the value of the field file. 
   * The formData is used to call the postIcon function to post the new icon to the icon folder.
   * The icons state is updated with the updated icon folder.
   */
  async function handleUploadIcon(e:React.ChangeEvent<HTMLInputElement>) {
    e.preventDefault();

    const fileInput = e.target;

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      // Handle the case where there are no files selected
      return;
    }

    const file = fileInput.files[0];

    const formData = new FormData();
    formData.append("file", file);

    const result: { [key: string]: any } = await FileSystemService.postIcon(formData);
    console.log("filename:", result["filename"]);
    console.log("size:", result["size"]);
  
    //Resets the file input field
    e.target.value = '';                

    FileSystemService.listFiles(ServerSidePaths.getIconsPath()).then((iconFiles) => {
      setIcons(iconFiles);
    });

  }
  
  /**
   * Deletes the selected project from the projects state
   * Also deletes the selected project folder with delete function from FileSystemService
   */
  async function handleDelete(){
  
    // Has to .splice since useState value doesnt change
    // immediately but only schedules a change. 
    projects.splice(actionOnProject.projectIndex, 1);

    await formattingProjectData();
    
    FileSystemService.delete('../', ServerSidePaths.getProjectPath(user) + `/${actionOnProject.projectTitle}`);
    console.log(ServerSidePaths.getProjectPath(user) + `/${actionOnProject.projectTitle}`);

    toast.info("Deleted " + actionOnProject.projectTitle);

    //Resets the actionOnProject state
    setActionOnProject({projectTitle:"", projectIndex: -1});

    setModalOpen({currentModalTitle: "deleteModal", isOpen: false});

  }
  
  /**
   * Runs through the projects state and looks for the one to archive. 
   * Sets IsActive to false for the selected project
   */
  async function handleArchive(){
  
    projects.map((project) => {
      if(project.getTitle() === actionOnProject.projectTitle){
        project.setIsActive(false)
      }
    })
    //projects[actionOnProject.projectIndex].setIsActive(false);
    
    await formattingProjectData();
    
    toast.info("Moved " + actionOnProject.projectTitle + " to archive" );

    //Resets the actionOnProject state
    setActionOnProject({projectTitle:"", projectIndex: -1});

    setModalOpen({currentModalTitle: "archiveModal", isOpen: false});
    
  }

  /**
   * Case 1 - Creating a new project:
   * Filters through the projects. If there is a match in title with the new project - notUniqueTitle is > 0
   * creation is true - maxIndex is 0
   * 
   * Case 2 - Editing a project:
   * Filters through the projects. 
   * If there is a match in title with the project being edited, that is not the prev title - notUniqueTitle is > 1
   * creation is true - maxIndex is 1
   */
  function isTitleUnique (title: string, creation: boolean) {

    try {
      
      const notUniqueTitle = projects.filter(project => {return project.getTitle() === title});
      const maxIndex = (creation) ? 0 : 1;
      if(notUniqueTitle.length > maxIndex){

        if(notUniqueTitle.some(project=>{return project.getIsActive() === false})){
          toast.info("The conflicting project is located in history");
        }

        throw new TitleDuplicateException();

      }

    } catch(err) {

      throw err;

    }


  }

  /**
   * Checks if the user is currently editing a project, if not - creating state is set to true
   */
  const handleCreateButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      const editingProject = projects.filter((project) => project.getBeingEdited());
  
      if (editingProject.length) {
        throw new CreateWhileEdit(editingProject[0].getTitle());
      }
  
      setCreating(true);
    } catch (err) {
      if (err instanceof CreateWhileEdit) {
        toast.warning(err.message);
      }
    }
  };

  /**
   * Case 1 - The user cancels editing a project:
   * The project title is set to be the previous title before edit and beingEdited is set to false
   * 
   * Case 2 - The user starts to edit a project:
   * The previousTitle is set to be the project title for safe keeping and beingEdited is set to true
   */
  const handleEdit = (editedProject:ProjectObject) => {

    if(editedProject.getBeingEdited()){
      editedProject.setTitle(editedProject.getpreviousTitle());
      editedProject.setBeingEdited(false);
    } else {
      editedProject.setpreviousTitle(editedProject.getTitle());
      editedProject.setBeingEdited(true);
    
    }
    // Update the project in the state
    setProjects((prevProjects) => {
      // Your logic to update the project goes here
      return [...prevProjects];
    });
  };
  
  /**
   * Checks if the user is already creating or editing another project
   * Calls handleEdit
   */
  const setEdit = (project:ProjectObject) => {
    try {
      
      const editingProject = projects.filter(project => {return project.getBeingEdited()});
      
      if(creatingProject){
        throw new EditWhileCreating();
      }
      
      if(editingProject.length) {
        throw new EditingAlreadyActive(editingProject[0].getTitle());
      }
      //SAD project.getTitle() 
      setActionOnProject({projectTitle: project.getTitle(), projectIndex: -1});
      handleEdit(project);

    } catch (err){
      
      if(err instanceof EditWhileCreating) {
        toast.warning(err.message);
      }

      if(err instanceof EditingAlreadyActive) {
        toast.warning(err.message);
      }
    }
  }

/**
  * When a new project is submitted, the new project is placed as the first object in the projects state.
  * A new directory with the project title is made within the database.
  */
  async function createFolders(){
    await FileSystemService.makeDirectory('../', ServerSidePaths.getProjectPath(user) + `/${newProject.getTitle()}`);
    await FileSystemService.writeToJSONFile([],ServerSidePaths.getProjectPath(user) + `/${newProject.getTitle()}/` + "forms.json")
  } 

  const handleFormSubmit = (e:React.FormEvent<HTMLFormElement>) => {

    e.preventDefault();

    try {

      let validatedTitle = validateProjectData.parse({ title: newProject.getTitle() });
      newProject.setTitle(validatedTitle.title);
      isTitleUnique(newProject.getTitle(), creatingProject);
    
      //Sets a default icon if none is chosen
      if(newProject.getIcon() === ""){
        newProject.setIcon("allan.jpg");
      }
      
      //converts the new project to an ProjectObject as the already existing objects
      const projectObject: ProjectObject = newProject.convertToProjectObject();
      
      projects.unshift(projectObject);
     
      formattingProjectData();
      
      createFolders();
      
      //Resets the newProject state with empty values
      setNewProject((prevProject) => {
        const updatedProject = new Project();
        updatedProject.setProject({ ...prevProject.getProject(), title: '', icon: '' });
        return updatedProject;
      });

      setCreating(false);
      
      toast.success("Created Project: " + newProject.getTitle());

    } catch (err) {
      if (err instanceof z.ZodError) {
        err.errors.forEach((validationError) => {
          toast.error(validationError.message);
        });
      }

      if (err instanceof TitleDuplicateException) {
        toast.error(err.message);
      }
    }
  };

  
  return (
    <>
      <div className="flex flex-wrap">
      <ToastContainer />
        <div id="outerDiv" className="w-full">

          <Modal
            
            isOpen={(modalOpen.currentModalTitle === "iconModal") ? modalOpen.isOpen : false}
            onRequestClose={() => setModalOpen({currentModalTitle: "", isOpen: false})}
            contentLabel="Choose Icon Modal"
            className="modal-icon"
           
          >
            <img className="w-6 h-6 float-right hover:scale-125" src={ServerSidePaths.URLFunctionIconsPath + "/cross.png"} title={"Cancel"} onClick={() => setModalOpen({currentModalTitle: "", isOpen: false})}></img>
            
            <form 
            className="mt-6" 
            onSubmit={() => setModalOpen({currentModalTitle: "", isOpen: false})}>
              <h2 className="text-3xl text-center m-4">Select Project Icon</h2>
              <div id="chooseIcon" className="grid grid-cols-3 gap-2 place-items-center m-12">

                {icons.map(icon => ( 

                  <div key={icon + "Div"}>
                    <label>
                      <input type="radio" onChange={(e) => newProject.setIcon(e.target.value)} name="icon" value={icon} className="hidden"></input>
                      <img src={`${URLIconsPath}/${icon}`} alt={icon} title={icon} width={50} height={50} className="hover:scale-125"/>
                    </label>
                  </div>
                ))}
    
              </div>
                
              <hr className="rounded-lg border-2"></hr>

              <h2 className="text-3xl text-center m-4">Or Upload Image</h2>
              <div id="uploadIcon" className="grid place-items-center m-12">

                <label htmlFor="file-input">
                  <img title={"upload"} className="w-10 h-10 hover:scale-125" src={ServerSidePaths.URLFunctionIconsPath + "/upload.png"}/>
                </label>
                <input id="file-input" type="file" onChange={e => handleUploadIcon(e)} className="hidden"/>

              </div>
 
              <button 
                type="submit"
                title="submitButton"
                onClick={() => setModalOpen({currentModalTitle: "", isOpen: false})}
                className="w-full px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:bg-gray-600 hover:scale-105" >
                Submit
              </button>

            </form>
          </Modal>

          <Modal
            
            isOpen={(modalOpen.currentModalTitle === "deleteModal") ? modalOpen.isOpen : false}
            onRequestClose={() => setModalOpen({currentModalTitle: "", isOpen: false})}
            contentLabel="Delete confirm modal"
            className="modal-confirm"
          >
            <img title={"Cancel"} className="w-6 h-6 float-right hover:scale-125" src={ServerSidePaths.URLFunctionIconsPath + "/cross.png"} onClick={() => setModalOpen({currentModalTitle: "deleteModal", isOpen: false})}></img>
            
            <p className="mt-8 mb-8 text-xl text-center">Are you sure you would like to delete {actionOnProject?.projectTitle} ?</p>
            
            <p className="mt-8 mb-8 text-l text-center">Deleted objects can never be recovered</p>

            <button 
                type="button"
                title="deleteButton"
                onClick={handleDelete}
                className="float-left m-2 px-12 py-2 tracking-wide text-white transition-colors duration-200 transform bg-red-700 rounded-md hover:bg-red-600 focus:outline-none focus:bg-red-600 hover:scale-105" >
                Delete
              </button>
            <button 
                type="button"
                title="cancelButton"
                onClick={() => setModalOpen({currentModalTitle: "deleteModal", isOpen: false})}
                className="float-right m-2 px-12 py-2 tracking-wide text-white transition-colors duration-200 transform bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:bg-gray-600 hover:scale-105" >
                Cancel
              </button>
          </Modal>
          
          <Modal
            className="modal-confirm"
            isOpen={(modalOpen.currentModalTitle === "archiveModal") ? modalOpen.isOpen : false}
            onRequestClose={() => setModalOpen({currentModalTitle: "archiveModal", isOpen: false})}
            contentLabel="Archive confirm modal"
            
          >
            <img title={"Cancel"} className="w-6 h-6 float-right hover:scale-125" src={ServerSidePaths.URLFunctionIconsPath + "/cross.png"} onClick={() => setModalOpen({currentModalTitle: "archiveModal", isOpen: false})}></img>
            
            <p className="mt-8 mb-8 text-xl text-center">Are you sure you would like to archive {actionOnProject?.projectTitle} ?</p>

            <button 
                type="button"
                title="archiveButton" 
                onClick={handleArchive}
                className="float-left m-2 px-12 py-2 tracking-wide text-white transition-colors duration-200 transform bg-red-700 rounded-md hover:bg-red-600 focus:outline-none focus:bg-red-600 hover:scale-105" >
                Archive
              </button>
            <button 
                type="button"
                title="cancelButton"
                onClick={() => setModalOpen({currentModalTitle: "archiveModal", isOpen: false})}
                className="float-right m-2 px-12 py-2 tracking-wide text-white transition-colors duration-200 transform bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:bg-gray-600 hover:scale-105" >
                Cancel
              </button>

          </Modal>
          

          {/* 
          * Begin Active / History Tab
          */}
          <ul key="ul1" 
            className="flex mb-0 list-none flex-wrap pt-3 pb-4 flex-row max-w-screen-2xl mx-auto"
            role="tablist"
          >
            <li key="activeTab" className="-mb-px mr-2 last:mr-0 flex-auto text-center">
              <a key="activeTabLink"
                className={
                  "text-xs font-bold uppercase px-5 py-3 shadow-lg rounded block leading-normal " +
                  (openTab === 1
                    ? "text-white bg-palette-500"
                    : "text-palette-500 bg-white-300")
                }
                onClick={e => {
                  e.preventDefault();
                  setOpenTab(1);
                }}
                data-toggle="tab"
                href="#link1"
                role="tablist"
              >
                Active
              </a>
            </li>
            <li key="historyTab" className="-mb-px mr-2 last:mr-0 flex-auto text-center">
              <a key="historyTabLink"
                className={
                  "text-xs font-bold uppercase px-5 py-3 shadow-lg rounded block leading-normal " +
                  (openTab === 2
                    ? "text-white bg-palette-500"
                    : "text-palette-500 bg-white-300")
                }
                onClick={e => {
                  e.preventDefault();
                  setOpenTab(2);
                }}
                data-toggle="tab"
                href="#link2"
                role="tablist"
              >
                History
              </a>
            </li>
          </ul>
          {/* 
          * End Active / History Tab
          */}



          <div className="relative flex flex-col min-w-72 break-words bg-white w-full mb-6 shadow-lg rounded">
            <div className="px-4 py-5 flex-auto">
              <div className="tab-content tab-space">

                {/* 
                *  Begin Elements shown when on Active Tab
                */}
                <div className={(openTab === 1 ? "block" : "hidden") + " grid grid-cols-1 lg:grid-cols-3 2xl:grid-cols-5 place-items-center"}  id="link1">
                  
                  {/* 
                  * Elements in the following Div are hidden if 
                  * creatingProject useState is true
                  */}
                  <div 
                    id="newProjectDiv" 
                    className={(!creatingProject ? "block " : "hidden ") + "grid place-items-center h-30 w-30 border-dashed rounded-lg border-4 border-grey-600 bg-grey-400 p-8 inline-block m-24 inline-block bg-grey-400 "}>
                      <h3>Create New</h3>
                      <button title={"New"} className={"text-5xl text-align-center hover:scale-125"}
                      onClick={handleCreateButtonClick}
                      >+</button>
                  </div>

                  {/* 
                  * Elements in the following Div are hidden if 
                  * creatingProject useState is false
                  */}
                  <div 
                  id="createProjectDiv" 
                  className={(creatingProject ? "block " : "hidden ") + "grid shadow-xl h-30 w-60 border-solid border-4 border-grey-800 bg-grey-400 p-8 inline-block m-12 inline-block bg-grey-400"}>

                    <form className="mt-6" onSubmit={handleFormSubmit}>
                      <div 
                        className="mb-4">
                          <input
                            type="text" 
                            id="projectname" 
                            placeholder="Project Name" 
                            autoComplete="Project Name" 
                            name="title"
                            value={newProject.getTitle()} 
                            onChange={(e) => setNewProject((prevProject) => {
                              const updatedProject = new Project();
                              updatedProject.setProject({ ...prevProject.getProject(), title: e.target.value });
                              return updatedProject;
                            })}

                            className="block w-full px-4 py-2 text-gray-700 bg-white border rounded-md focus:border-gray-400 focus:ring-gray-300 focus:outline-none focus:ring focus:ring-opacity-40"
                          />
                      </div>
                      
                      <div className="mt-2 grid place-items-center">
                        {(newProject.getIcon() === "") ? 
                        (
                          <button type="button">
                            <img className="w-10 h-10 hover:scale-125" src={ServerSidePaths.URLFunctionIconsPath + "/upload.png"} title={"Upload"}
                            onClick={ e => {
                              e.preventDefault();
                              setModalOpen({currentModalTitle: "iconModal", isOpen: true});
                            }}></img>
                        </button>
                        ) : (
                          <button type="button">
                          <img title={"Project"} className="w-10 h-10 hover:scale-125" src={"icons/" + newProject.getIcon()}
                          onClick={ e => {
                          e.preventDefault();
                          setModalOpen({currentModalTitle: "iconModal", isOpen: true});
    
                        }}></img>
                        </button>
                        )
                        } 
                        
                      </div>

                      <div>
                        <br/>
                        <img title={"Cancel"} className="w-6 h-6 float-left hover:scale-125" src={ServerSidePaths.URLFunctionIconsPath + "/cross.png"}
                        onClick={ e => {
                          setNewProject((prevProject) => {
                            const updatedProject = new Project();
                            updatedProject.setProject({ ...prevProject.getProject(), icon: '' , title: ''});
                            return updatedProject;
                          });
                          setCreating(false);
                          e.preventDefault(); // Prevent the form submission
                        }}></img>
                        <button
                          type="submit"
                          className="p-0 m-0 float-right border-none bg-none cursor-pointer"
                        >
                          <img
                            title={"Submit"}
                            className="w-6 h-6 float-right hover:scale-125"
                            src={ServerSidePaths.URLFunctionIconsPath + "/checkmark.png"}
                            alt="Submit"
                          />
                        </button>
                        
                      </div>
                      
                    </form>

                  </div>
                  

                  {/*
                  * maps through all the projects stored in the Array,
                  * creating the object to interact with on the page
                  */}
                  {projects.map((project, i) => 
                  
                    //Creates the project element if the projects' isActive is true
                    project.getIsActive() ? (
                      <div key={"DivActive" + project.getTitle() + i} className="hover:scale-105 shadow-xl h-30 w-60 border rounded-md border-4 border-grey-600 bg-grey-400 p-8 inline-block m-12 inline-block bg-grey-400">
                        
                        {/* Archive Icon to archive the project */}
                        <div 
                          className="flex justify-between items-center">
                            
                            <Link 
                              href={"/" + user + "/" + project.getTitle().replace(/ /g, '-') + "/chart"}
                            >
                              <img 
                                title={"Charts"} 
                                className="w-6 h-6 hover:cursor-pointer  hover:scale-125" 
                                src={ServerSidePaths.URLFunctionIconsPath + "/chart.png"}
                              />
                            </Link>
                            
                            <img title={"Archive"} className="w-6 h-6 hover:scale-125 hover:cursor-pointer" src={ServerSidePaths.URLFunctionIconsPath + "/archive.png"}
                            onClick={ e => {
                              setModalOpen({currentModalTitle: "archiveModal", isOpen: true});
                              setActionOnProject({projectTitle: project.getTitle(), projectIndex: i});
                              console.log(project.getTitle());
                            }}>
                            </img>
                        </div>

                        <form key={"Form" + project.getTitle() + i} onSubmit={(e) =>{
                          e.preventDefault();
                          project.setBeingEdited(false);
                        }}>
                          
                          {/* 
                          * if the Project is being edited, an input field
                          * is shown instead of a paragraph
                          */}
                          { (project.getBeingEdited()) ? (
                            <div className="relative ">
                              <input
                              type="text" 
                              value={actionOnProject?.projectTitle}
                              key={"inputField" + i}
                              onChange={(e)=>{setActionOnProject({projectTitle: e.target.value, projectIndex: -1})                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault(); // Prevent the form submission
                                  try {
                                    let validatedTitle = validateProjectData.parse({title: actionOnProject.projectTitle});
                                    project.setTitle(validatedTitle.title);
                                    isTitleUnique(project.getTitle(), creatingProject);
                                    project.setBeingEdited(false);
                                    formattingProjectData();
                                    FileSystemService.rename('../', ServerSidePaths.getProjectPath(user) + `/${project.getpreviousTitle()}`,project.getTitle());
                                    //setTrigger(!trigger);
                                  } catch(err) {

                                    if(err instanceof z.ZodError){

                                      err.errors.forEach((validationError)=> {
                                        toast.error(validationError.message);
                                      })  
                                    
                                  }

                                    if (err instanceof TitleDuplicateException){

                                      toast.error(err.message);
                                      
                                    }
                                  }

                                }
                              }}
                              name="title"
                              className="block w-full px-4 pr-9 py-2 mt-2 text-gray-700 bg-white border rounded-md focus:border-gray-400 focus:ring-gray-300 focus:outline-none focus:ring focus:ring-opacity-40"
                              />
                              <button 
                                type="button"
                                title="Cancel"
                                onClick={() => {handleEdit(project);}}
                                className="absolute right-0 top-1/2 transform -translate-y-1/2 px-[8px] py-[3px] text-black rounded-md border hover:text-white border-black-300 hover:bg-black-400 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2">
                                X
                              </button>
                            </div>
                          ) : (
                            <p 
                            key={"TitleActive" + project.getTitle() + i}
                            className="text-center pb-4">{project.getTitle()}</p>
                          ) }
                          
                          {/*
                          * Link if you click on the icon redirecting
                          * the user to the clicked project page
                          */}
                          <Link href={"/" + user + "/" + project.getTitle().replace(/ /g, '-')}>
                            <img 
                            title={"Project"}
                            key={"Icon" + project.getIcon() + i} 
                            src={`${URLIconsPath}/${project.getIcon()}`}
                            width={50} 
                            height={50} 
                            className="mt-4 mx-auto block rounded"/>
                          </Link><br />
                          
                          <div 
                            
                            key={"buttonsDiv" + i}
                            className="flex justify-between items-center ">
                            <img title={"Delete"} className="w-4 h-6 hover:cursor-pointer  hover:scale-125" src={ServerSidePaths.URLFunctionIconsPath + "/trash.png"}
                            onClick={ e => {
                              setModalOpen({currentModalTitle: "deleteModal", isOpen: true});
                              setActionOnProject({projectTitle: project.getTitle(), projectIndex: i});
                              console.log(project.getTitle());
                            }}>
                            </img>
                            <img title={"Edit"} className="w-4 h-6  hover:scale-125 hover:cursor-pointer" src={ServerSidePaths.URLFunctionIconsPath + "/edit.png"}
                            onClick={()=>{setEdit(project);}}>
                            </img>
                          </div>
                        </form>
                      </div>  

                      ) : (

                        <p key={project.getTitle() + "" + i} className="hidden"/>

                      )
                  )}

                </div>
                {/* 
                *  End Elements shown when on Active Tab
                */}


                {/* 
                *  Begin Elements shown when on History Tab
                *  History is a synchrone version of Active - Just
                *  Without the ability to edit and archive the project
                */}
                <div className={(openTab === 2 ? "block" : "hidden") + " grid grid-cols-3 gap-2 place-items-center"} id="link2">
                  
                  {projects.map((project, i) => 
                    
                    project.getIsActive() ? (

                      <p key={project.getTitle() + "" + i} className="hidden"/>

                    ) : (

                      <div key={"DivHistory" + project.getTitle() + i} className="hover:scale-105 shadow-xl h-30 w-60 border rounded-md border-4 border-grey-600 bg-grey-400 p-8 inline-block m-24 inline-block bg-grey-400">
                      
                      <div 
                          className="flex justify-between items-center">
                            
                            <Link 
                              href={"/" + user + "/" + project.getTitle().replace(/ /g, '-') + "/chart"}
                            >
                              <img 
                                title={"Charts"} 
                                className="w-6 h-6 hover:cursor-pointer  hover:scale-125" 
                                src={ServerSidePaths.URLFunctionIconsPath + "/chart.png"}
                              />
                            </Link>
                            
                        </div>

                      <p key={"ProjectHistory" + project.getTitle() + i} className="text-center">{project.getTitle()}</p><br/>
                      
                      
                        <img 
                        title={"Project"}
                        key={"Icon" + project.getIcon() + i} 
                        src={`${URLIconsPath}/${project.getIcon()}`}
                        width={50} 
                        height={50} 
                        className="mt-4 mx-auto block rounded"/><br/>     
                      
                      
                      <div
                        key={"buttonsDiv" + i}
                            className="flex justify-between items-center ">
                        
                        <img title={"Delete"} className="w-4 h-6 float-left hover:scale-125" src={ServerSidePaths.URLFunctionIconsPath + "/trash.png"}
                        onClick={ e => {
                              setModalOpen({currentModalTitle: "deleteModal", isOpen: true});
                              setActionOnProject({projectTitle: project.getTitle(), projectIndex: i});
                        
                        }}>
                        </img>
                      </div>
                    </div>  
                    )
                  )}
                </div>  
                {/* 
                *  End Elements shown when on History Tab
                */}

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};